import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_pet(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
            "birthday": "2024-01-15",
            "weight_kg": 4.5,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "小橘"
    assert data["species"] == "cat"


@pytest.mark.asyncio
async def test_list_pets(client: AsyncClient, auth_headers):
    await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
        headers=auth_headers,
    )
    resp = await client.get("/api/pets", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_pet(client: AsyncClient, auth_headers):
    create_resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
        headers=auth_headers,
    )
    pet_id = create_resp.json()["id"]
    resp = await client.put(
        f"/api/pets/{pet_id}",
        json={"name": "大橘"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "大橘"


@pytest.mark.asyncio
async def test_delete_pet(client: AsyncClient, auth_headers):
    create_resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
        headers=auth_headers,
    )
    pet_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/pets/{pet_id}", headers=auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_add_weight(client: AsyncClient, auth_headers):
    create_resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
        headers=auth_headers,
    )
    pet_id = create_resp.json()["id"]
    resp = await client.post(
        f"/api/pets/{pet_id}/weight",
        json={"weight_kg": 4.8, "recorded_at": "2026-06-13"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["weight_kg"] == 4.8


@pytest.mark.asyncio
async def test_get_weight_history(client: AsyncClient, auth_headers):
    create_resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
        headers=auth_headers,
    )
    pet_id = create_resp.json()["id"]
    await client.post(
        f"/api/pets/{pet_id}/weight",
        json={"weight_kg": 4.8, "recorded_at": "2026-06-13"},
        headers=auth_headers,
    )
    resp = await client.get(f"/api/pets/{pet_id}/weight/history", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_create_pet_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/api/pets",
        json={
            "name": "小橘",
            "species": "cat",
            "breed": "中华田园猫",
            "gender": "male",
            "neutered": True,
        },
    )
    assert resp.status_code == 403
