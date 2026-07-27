def test_create_zone_reports_two_records_soa_and_ns(authenticated_client):
    """AC-2: creating example.com reports recordCount 2; SOA + a 4-value NS set."""
    response = authenticated_client.post(
        "/v1/hosted-zones", json={"name": "example.com", "type": "PUBLIC"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["recordCount"] == 2
    assert len(body["nameServers"]) == 4
    assert body["zoneId"].startswith("Z")

    records_response = authenticated_client.get(f"/v1/hosted-zones/{body['zoneId']}/records")
    records = records_response.json()["items"]
    by_type = {r["type"]: r for r in records}
    assert set(by_type) == {"SOA", "NS"}
    assert len(by_type["NS"]["values"]) == 4
    assert len(by_type["SOA"]["values"]) == 1


def test_create_zone_duplicate_name_returns_409(authenticated_client):
    authenticated_client.post("/v1/hosted-zones", json={"name": "dupe-test.com", "type": "PUBLIC"})

    response = authenticated_client.post(
        "/v1/hosted-zones", json={"name": "dupe-test.com", "type": "PUBLIC"}
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ConflictingDomainExists"


def test_list_endpoint_requires_auth(client):
    response = client.get("/v1/hosted-zones")
    assert response.status_code == 401


def test_search_and_pagination_ac3(authenticated_client):
    """AC-3: 25 zones, a 3-char substring matches 3, pagination reports 3 pages at
    10/page with page 2 different from page 1 once the filter is cleared."""
    for i in range(3):
        authenticated_client.post(
            "/v1/hosted-zones", json={"name": f"xyzmatch{i}.com", "type": "PUBLIC"}
        )
    for i in range(25):
        authenticated_client.post(
            "/v1/hosted-zones", json={"name": f"bulk-zone-{i}.com", "type": "PUBLIC"}
        )

    matched = authenticated_client.get("/v1/hosted-zones", params={"search": "xyzmatch"}).json()
    assert matched["total"] == 3
    assert len(matched["items"]) == 3

    all_bulk = authenticated_client.get(
        "/v1/hosted-zones", params={"search": "bulk-zone", "page_size": 10}
    ).json()
    page2 = authenticated_client.get(
        "/v1/hosted-zones", params={"search": "bulk-zone", "page_size": 10, "page": 2}
    ).json()

    assert all_bulk["total"] == 25
    assert all_bulk["total_pages"] == 3
    assert len(all_bulk["items"]) == 10
    names_page1 = {item["name"] for item in all_bulk["items"]}
    names_page2 = {item["name"] for item in page2["items"]}
    assert names_page1.isdisjoint(names_page2)


def test_patch_rejects_name_and_type_ac5(authenticated_client):
    create_response = authenticated_client.post(
        "/v1/hosted-zones", json={"name": "immutable-router-test.com", "type": "PUBLIC"}
    )
    zone_id = create_response.json()["zoneId"]

    name_response = authenticated_client.patch(
        f"/v1/hosted-zones/{zone_id}", json={"name": "changed.com"}
    )
    type_response = authenticated_client.patch(
        f"/v1/hosted-zones/{zone_id}", json={"type": "PRIVATE"}
    )

    assert name_response.status_code == 422
    assert name_response.json()["error"]["code"] == "InvalidInput"
    assert type_response.status_code == 422

    unchanged = authenticated_client.get(f"/v1/hosted-zones/{zone_id}").json()
    assert unchanged["name"] == "immutable-router-test.com"
    assert unchanged["type"] == "PUBLIC"


def test_patch_updates_description_and_tags(authenticated_client):
    create_response = authenticated_client.post(
        "/v1/hosted-zones", json={"name": "editable-router-test.com", "type": "PUBLIC"}
    )
    zone_id = create_response.json()["zoneId"]

    response = authenticated_client.patch(
        f"/v1/hosted-zones/{zone_id}",
        json={"description": "updated", "tags": [{"key": "Env", "value": "staging"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "updated"
    assert body["tags"] == [{"key": "Env", "value": "staging"}]
