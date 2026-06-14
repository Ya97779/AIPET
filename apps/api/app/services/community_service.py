from sqlalchemy import select, func, update, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.community import Question, Answer, Like
from app.models.pet import Pet
from app.services.points_service import PointsService

ANSWER_REWARD = 20


class CommunityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.points_service = PointsService(db)

    async def create_question(self, user_id: str, title: str, content: str, category: str,
                               bounty_points: int = 0, pet_id: str | None = None,
                               image_urls: list[str] | None = None) -> Question:
        if bounty_points > 0:
            success = await self.points_service.deduct_points(user_id, bounty_points, "question_cost")
            if not success:
                raise ValueError("积分不足")

        question = Question(
            user_id=user_id, title=title, content=content, category=category,
            bounty_points=bounty_points, pet_id=pet_id, image_urls=image_urls or [],
        )
        self.db.add(question)
        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def get_questions(self, category: str | None = None, sort: str = "latest",
                            page: int = 1, limit: int = 20) -> tuple[list[Question], int]:
        query = select(Question)
        count_query = select(func.count(Question.id))

        if category:
            query = query.where(Question.category == category)
            count_query = count_query.where(Question.category == category)

        if sort == "hottest":
            query = query.order_by(Question.view_count.desc())
        elif sort == "unanswered":
            query = query.where(Question.status == "open").order_by(Question.created_at.desc())
        else:
            query = query.order_by(Question.created_at.desc())

        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        questions = list(result.scalars().all())
        return questions, total

    async def get_question_detail(self, question_id: str, user_id: str) -> dict | None:
        await self.db.execute(
            update(Question).where(Question.id == question_id).values(view_count=Question.view_count + 1)
        )
        await self.db.commit()

        result = await self.db.execute(select(Question).where(Question.id == question_id))
        question = result.scalar_one_or_none()
        if not question:
            return None

        answers_result = await self.db.execute(
            select(Answer).where(Answer.question_id == question_id)
            .order_by(Answer.is_accepted.desc(), Answer.like_count.desc())
        )
        answers = list(answers_result.scalars().all())

        liked_answer_ids = set()
        if answers:
            answer_ids = [a.id for a in answers]
            likes_result = await self.db.execute(
                select(Like.answer_id).where(
                    and_(Like.user_id == user_id, Like.answer_id.in_(answer_ids))
                )
            )
            liked_answer_ids = {row[0] for row in likes_result.all()}

        pet_info = None
        if question.pet_id:
            pet_result = await self.db.execute(select(Pet).where(Pet.id == question.pet_id))
            pet = pet_result.scalar_one_or_none()
            if pet:
                pet_info = {"name": pet.name, "species": pet.species, "breed": pet.breed}

        return {
            "question": question, "answers": answers,
            "liked_answer_ids": liked_answer_ids, "pet_info": pet_info,
        }

    async def create_answer(self, question_id: str, user_id: str, content: str,
                             image_urls: list[str] | None = None) -> Answer:
        answer = Answer(
            question_id=question_id, user_id=user_id,
            content=content, image_urls=image_urls or [],
        )
        self.db.add(answer)

        await self.db.execute(
            update(Question).where(Question.id == question_id)
            .values(answer_count=Question.answer_count + 1)
        )
        await self.db.commit()

        await self.points_service.add_points(user_id, ANSWER_REWARD, "answer_reward", answer.id)

        await self.db.refresh(answer)
        return answer

    async def accept_answer(self, question_id: str, answer_id: str, user_id: str) -> dict:
        result = await self.db.execute(select(Question).where(Question.id == question_id))
        question = result.scalar_one_or_none()
        if not question:
            return {"error": "问题不存在"}
        if question.user_id != user_id:
            return {"error": "只能采纳自己问题的回答"}
        if question.status == "answered":
            return {"error": "已采纳过回答"}

        await self.db.execute(
            update(Answer).where(Answer.id == answer_id).values(is_accepted=True)
        )
        await self.db.execute(
            update(Question).where(Question.id == question_id)
            .values(accepted_answer_id=answer_id, status="answered")
        )
        await self.db.commit()

        if question.bounty_points > 0:
            answer_result = await self.db.execute(select(Answer).where(Answer.id == answer_id))
            answer = answer_result.scalar_one()
            await self.points_service.add_points(
                answer.user_id, question.bounty_points, "bounty_reward", answer_id
            )

        return {"success": True}

    async def like_answer(self, answer_id: str, user_id: str) -> dict:
        existing = await self.db.execute(
            select(Like).where(and_(Like.user_id == user_id, Like.answer_id == answer_id))
        )
        if existing.scalar_one_or_none():
            return {"error": "已点赞", "status": 409}

        like = Like(user_id=user_id, answer_id=answer_id)
        self.db.add(like)
        await self.db.execute(
            update(Answer).where(Answer.id == answer_id).values(like_count=Answer.like_count + 1)
        )
        await self.db.commit()
        return {"success": True}

    async def get_my_questions(self, user_id: str) -> list[Question]:
        result = await self.db.execute(
            select(Question).where(Question.user_id == user_id).order_by(Question.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_my_answers(self, user_id: str) -> list[Answer]:
        result = await self.db.execute(
            select(Answer).where(Answer.user_id == user_id).order_by(Answer.created_at.desc())
        )
        return list(result.scalars().all())
