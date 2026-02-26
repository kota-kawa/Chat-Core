from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

NonEmptyStr = Annotated[str, Field(min_length=1)]


class RequestPayloadModel(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class EmailRequest(RequestPayloadModel):
    email: NonEmptyStr


class AuthCodeRequest(RequestPayloadModel):
    authCode: str | None = None


class NewChatRoomRequest(RequestPayloadModel):
    id: str
    title: str = "新規チャット"


class ChatRoomIdRequest(RequestPayloadModel):
    room_id: NonEmptyStr


class RenameChatRoomRequest(RequestPayloadModel):
    room_id: NonEmptyStr
    new_title: NonEmptyStr


class ChatMessageRequest(RequestPayloadModel):
    message: str
    chat_room_id: str = "default"
    model: str | None = None


class UpdateTasksOrderRequest(RequestPayloadModel):
    order: list[NonEmptyStr] = Field(min_length=1)


class DeleteTaskRequest(RequestPayloadModel):
    task: NonEmptyStr


class EditTaskRequest(RequestPayloadModel):
    old_task: NonEmptyStr
    new_task: NonEmptyStr
    prompt_template: str | None = None
    input_examples: str | None = None
    output_examples: str | None = None


class AddTaskRequest(RequestPayloadModel):
    title: NonEmptyStr
    prompt_content: NonEmptyStr
    input_examples: str = ""
    output_examples: str = ""


class SharedPromptCreateRequest(RequestPayloadModel):
    title: NonEmptyStr
    category: NonEmptyStr
    content: NonEmptyStr
    author: NonEmptyStr
    input_examples: str = ""
    output_examples: str = ""


class BookmarkCreateRequest(RequestPayloadModel):
    title: NonEmptyStr
    content: NonEmptyStr
    input_examples: str = ""
    output_examples: str = ""


class BookmarkDeleteRequest(RequestPayloadModel):
    title: NonEmptyStr


class PromptListEntryCreateRequest(RequestPayloadModel):
    prompt_id: int | None = None
    title: NonEmptyStr
    category: str = ""
    content: NonEmptyStr
    input_examples: str = ""
    output_examples: str = ""


class PromptUpdateRequest(RequestPayloadModel):
    title: NonEmptyStr
    category: NonEmptyStr
    content: NonEmptyStr
    input_examples: str = ""
    output_examples: str = ""


class MemoCreateRequest(RequestPayloadModel):
    input_content: str = ""
    ai_response: NonEmptyStr
    title: str = ""
    tags: str = ""
