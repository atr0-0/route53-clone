def test_records_endpoint_stacks_values_per_set_not_one_row_per_value(authenticated_client):
    create_response = authenticated_client.post(
        "/v1/hosted-zones", json={"name": "records-endpoint-test.com", "type": "PUBLIC"}
    )
    zone_id = create_response.json()["zoneId"]

    response = authenticated_client.get(f"/v1/hosted-zones/{zone_id}/records")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2  # SOA + apex NS only, at creation

    ns_record = next(r for r in body["items"] if r["type"] == "NS")
    assert len(ns_record["values"]) == 4  # one row, four stacked values — not 4 rows
    assert ns_record["isRequired"] is True


def test_records_endpoint_requires_auth(client):
    response = client.get("/v1/hosted-zones/ZDOESNOTEXIST/records")
    assert response.status_code == 401


def test_records_endpoint_404s_for_unknown_zone(authenticated_client):
    response = authenticated_client.get("/v1/hosted-zones/ZDOESNOTEXIST/records")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NoSuchHostedZone"


def _create_zone(client, name):
    response = client.post("/v1/hosted-zones", json={"name": name, "type": "PUBLIC"})
    return response.json()["zoneId"]


def test_post_record_returns_change_info(authenticated_client):
    zone_id = _create_zone(authenticated_client, "post-record-test.com")

    response = authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "www", "type": "A", "values": ["192.0.2.1", "192.0.2.2"], "ttl": 300},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["values"] == ["192.0.2.1", "192.0.2.2"]
    assert body["changeInfo"]["status"] == "INSYNC"
    assert body["changeInfo"]["id"].startswith("/change/C")


def test_post_record_invalid_value_returns_422_with_field(authenticated_client):
    zone_id = _create_zone(authenticated_client, "invalid-value-test.com")

    response = authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "www", "type": "A", "values": ["999.1.1.1"], "ttl": 300},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "InvalidInput"
    assert response.json()["error"]["field"] == "values[0]"


def test_patch_record_rejects_name_and_type(authenticated_client):
    zone_id = _create_zone(authenticated_client, "patch-reject-test.com")
    create_response = authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "www", "type": "A", "values": ["192.0.2.1"], "ttl": 300},
    )
    record_id = create_response.json()["recordId"]

    response = authenticated_client.patch(
        f"/v1/hosted-zones/{zone_id}/records/{record_id}", json={"name": "changed"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "InvalidInput"


def test_patch_record_updates_ttl(authenticated_client):
    zone_id = _create_zone(authenticated_client, "patch-ttl-test.com")
    create_response = authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "www", "type": "A", "values": ["192.0.2.1"], "ttl": 300},
    )
    record_id = create_response.json()["recordId"]

    response = authenticated_client.patch(
        f"/v1/hosted-zones/{zone_id}/records/{record_id}", json={"ttl": 600}
    )

    assert response.status_code == 200
    assert response.json()["ttl"] == 600


def test_delete_record_succeeds_and_delete_required_record_is_rejected(authenticated_client):
    zone_id = _create_zone(authenticated_client, "delete-record-test.com")
    create_response = authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "www", "type": "A", "values": ["192.0.2.1"], "ttl": 300},
    )
    record_id = create_response.json()["recordId"]

    delete_response = authenticated_client.delete(f"/v1/hosted-zones/{zone_id}/records/{record_id}")
    assert delete_response.status_code == 204

    records = authenticated_client.get(f"/v1/hosted-zones/{zone_id}/records").json()["items"]
    soa_record_id = next(r for r in records if r["type"] == "SOA")["recordId"]

    required_delete_response = authenticated_client.delete(
        f"/v1/hosted-zones/{zone_id}/records/{soa_record_id}"
    )
    assert required_delete_response.status_code == 400
    assert required_delete_response.json()["error"]["code"] == "InvalidChangeBatch"


def test_type_filter_and_search_combine_as_and(authenticated_client):
    """AC-10: given A, CNAME, MX, and TXT records, the type filter narrows to
    the selected types, and adding a search term applies both constraints."""
    zone_id = _create_zone(authenticated_client, "filter-combo-test.com")
    authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "findme", "type": "A", "values": ["192.0.2.1"], "ttl": 300},
    )
    authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "other", "type": "MX", "values": ["10 mail.example.com"], "ttl": 300},
    )
    authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "findme-cname", "type": "CNAME", "values": ["target.example.com"], "ttl": 300},
    )
    authenticated_client.post(
        f"/v1/hosted-zones/{zone_id}/records",
        json={"name": "other-txt", "type": "TXT", "values": ['"hello"'], "ttl": 300},
    )

    type_only = authenticated_client.get(
        f"/v1/hosted-zones/{zone_id}/records", params={"type": ["A", "MX"]}
    ).json()
    assert {r["type"] for r in type_only["items"]} == {"A", "MX"}

    type_and_search = authenticated_client.get(
        f"/v1/hosted-zones/{zone_id}/records", params={"type": ["A", "MX"], "search": "findme"}
    ).json()
    assert [r["name"] for r in type_and_search["items"]] == ["findme.filter-combo-test.com"]


def test_get_record_types_returns_all_nine_with_metadata(authenticated_client):
    """AC-11's backend half: the create form's validation comes from this payload."""
    response = authenticated_client.get("/v1/record-types")

    assert response.status_code == 200
    items = response.json()["items"]
    assert {item["type"] for item in items} == {
        "A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA",
    }
    mx = next(item for item in items if item["type"] == "MX")
    assert mx["placeholder"] == "10 mail.example.com"
    assert mx["multiValue"] is True
    cname = next(item for item in items if item["type"] == "CNAME")
    assert cname["maxValues"] == 1
