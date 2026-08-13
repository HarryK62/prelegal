import re

from fastapi.testclient import TestClient

from app.documents import load_document_registry
from app.main import app

client = TestClient(app)


def test_registry_covers_all_catalog_entries_except_mutual_nda_coverpage():
    registry = load_document_registry()
    assert len(registry) == 11
    assert "mutual-nda-coverpage" not in registry


def test_registry_marks_riders_as_requiring_a_base_agreement():
    registry = load_document_registry()
    assert registry["ai-addendum"].requires_base_agreement is True
    assert registry["baa"].requires_base_agreement is True
    assert registry["dpa"].requires_base_agreement is True
    assert registry["sla"].requires_base_agreement is True
    assert registry["mutual-nda"].requires_base_agreement is False
    assert registry["csa"].requires_base_agreement is False


def test_every_document_has_fields_and_clauses_with_no_leftover_span_tags():
    registry = load_document_registry()
    for doc in registry.values():
        assert doc.fields, f"{doc.id} has no fields"
        assert doc.clauses, f"{doc.id} has no clauses"
        for clause in doc.clauses:
            assert "<span" not in clause.body, f"{doc.id} clause {clause.number} leaked a span tag"
            assert "</span>" not in clause.body, f"{doc.id} clause {clause.number} leaked a closing span tag"


def test_every_field_token_referenced_in_clauses_has_a_matching_field():
    registry = load_document_registry()
    for doc in registry.values():
        field_keys = {f.key for f in doc.fields}
        body = " ".join(c.body for c in doc.clauses)
        tokens_used = set(re.findall(r"\{\{(\w+)\}\}", body))
        assert tokens_used <= field_keys, f"{doc.id} references unknown field tokens: {tokens_used - field_keys}"


def test_mutual_nda_gets_synthetic_party_fields_since_it_has_none_in_prose():
    registry = load_document_registry()
    field_keys = {f.key for f in registry["mutual-nda"].fields}
    assert "partyOneName" in field_keys
    assert "partyTwoName" in field_keys


def test_csa_party_fields_come_from_the_template_not_synthesized():
    registry = load_document_registry()
    field_keys = {f.key for f in registry["csa"].fields}
    assert "provider" in field_keys
    assert "customer" in field_keys
    assert "partyOneName" not in field_keys


def test_mutual_nda_does_not_leak_the_trailing_attribution_footer():
    # Only Mutual-NDA.md has a trailing "Common Paper ... free to use under [CC BY
    # 4.0](...)." footer line after its last clause, which must get stripped before
    # parsing rather than becoming part of the last clause's body.
    registry = load_document_registry()
    mutual_nda_text = " ".join(c.body for c in registry["mutual-nda"].clauses)
    assert "free to use under" not in mutual_nda_text
    assert "creativecommons.org" not in mutual_nda_text


def test_list_documents_endpoint_returns_all_documents():
    response = client.get("/api/documents")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 11
    mutual_nda = next(d for d in body if d["id"] == "mutual-nda")
    assert mutual_nda["requiresBaseAgreement"] is False
    assert any(f["key"] == "purpose" for f in mutual_nda["fields"])
