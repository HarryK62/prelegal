from datetime import date

from litellm import completion

from app.schemas import ChatRequest, ChatResponse, CoverPageFields

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

FIELD_GUIDE = """
You are a friendly legal-intake assistant helping a user fill in the Cover Page for a
Common Paper Mutual Non-Disclosure Agreement (Mutual NDA). Have a natural, free-form
conversation with the user: ask about a couple of related fields at a time, explain
briefly what a field means if the user seems unsure, and confirm your understanding
when an answer is ambiguous. Do not ask about fields that already have a value unless
the user brings it up or asks to change it.

The fields you are collecting, and what each means in the agreement:
- purpose: The business reason the parties are sharing confidential information (e.g.
  "evaluating a potential partnership").
- effectiveDate: The date the MNDA starts. Always return this as an ISO date
  (YYYY-MM-DD).
- mndaTermType ("expires" or "continues") and mndaTermYears: Whether the MNDA itself
  expires a number of years after the effective date, or continues until either party
  terminates it.
- confidentialityTermType ("years" or "perpetuity") and confidentialityTermYears: How
  long the duty to protect confidential information survives after the MNDA ends —
  either a number of years, or forever (perpetuity).
- governingLaw: The US state whose law governs the agreement.
- jurisdiction: The city/county and state where legal disputes must be filed.
- partyOne / partyTwo: Each party's contact details: name (signer's printed name),
  title (their role at their company), company (entity name), and noticeAddress
  (an email or postal address for legal notices).

You will be given the fields already known so far as JSON, and the conversation so far.
Always return the COMPLETE set of fields in your structured response: carry over every
value you already know unchanged, and only update the ones the latest user message
addressed. Never invent values the user hasn't given you — leave a field at its current
value (including empty strings) until the user actually provides it.
""".strip()


def build_system_prompt(fields: CoverPageFields) -> str:
    known_fields = fields.model_dump_json(by_alias=True)
    today = date.today().isoformat()
    return (
        f"{FIELD_GUIDE}\n\nToday's date is {today}. Use this to resolve relative dates "
        f'like "today" or "next Monday".\n\nFields known so far (JSON):\n{known_fields}'
    )


def get_chat_response(request: ChatRequest) -> ChatResponse:
    messages = [{"role": "system", "content": build_system_prompt(request.fields)}]
    messages.extend({"role": turn.role, "content": turn.content} for turn in request.messages)

    response = completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    result = response.choices[0].message.content
    return ChatResponse.model_validate_json(result)
