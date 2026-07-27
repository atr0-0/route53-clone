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
