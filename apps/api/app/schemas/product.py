from pydantic import BaseModel


class ProductRecommendResponse(BaseModel):
    id: str
    name: str
    description: str | None
    image_url: str | None
    price: str | None
    category: str | None
    tags: list

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    products: list[ProductRecommendResponse]
    total: int
