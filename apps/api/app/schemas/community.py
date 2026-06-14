from pydantic import BaseModel, Field
from datetime import datetime


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    content: str = Field(..., min_length=10, max_length=2000)
    category: str = Field(..., pattern="^(disease|nutrition|behavior|daily|other)$")
    pet_id: str | None = None
    bounty_points: int = Field(default=0, ge=0)
    image_urls: list[str] = []


class AuthorResponse(BaseModel):
    id: str
    nickname: str | None
    avatar_url: str | None

    class Config:
        from_attributes = True


class AnswerResponse(BaseModel):
    id: str
    content: str
    image_urls: list
    is_accepted: bool
    like_count: int
    liked_by_me: bool = False
    author: AuthorResponse
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListItem(BaseModel):
    id: str
    title: str
    category: str
    bounty_points: int
    status: str
    view_count: int
    answer_count: int
    author: AuthorResponse
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionDetail(BaseModel):
    id: str
    title: str
    content: str
    image_urls: list
    category: str
    bounty_points: int
    status: str
    view_count: int
    answer_count: int
    accepted_answer_id: str | None
    author: AuthorResponse
    pet: dict | None = None
    answers: list[AnswerResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class AnswerCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=2000)
    image_urls: list[str] = []


class QuestionListResponse(BaseModel):
    questions: list[QuestionListItem]
    total: int
    page: int
    limit: int
