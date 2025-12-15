"""LLM service using Volcengine Doubao for multimodal analysis."""

import httpx
from app.config import settings


SCORING_PROMPT = """
你是一位专业的 TOEFL 口语评分官。请根据考生的录音和转录文本，生成详细分析报告。

## 输入信息
- 题目：{question_instruction}
- 转录文本：{transcript}
- 音频：[已附加]

## 评分标准（满分 30 分）
- Delivery (0-10): 流利度、发音清晰度、语速、语调
- Language Use (0-10): 语法准确性、词汇丰富度、句式多样性
- Topic Development (0-10): 论点清晰度、逻辑连贯性、例证充分性

## 请以 Markdown 格式输出报告：

# TOEFL Speaking 分析报告

## 📊 总体评分
- **预估分数**: X/30 (等级: Limited/Fair/Good/Excellent)
- **Delivery**: X/10 - 简评
- **Language Use**: X/10 - 简评
- **Topic Development**: X/10 - 简评

## 💡 一句话总结
> 总结亮点和主要改进方向

## 📝 逐句分析

### 句子 1
> 原文：xxx

**评价**：✅ 优秀 / ⚡ 可改进 / ❌ 需修正

**Native 版本**：xxx

**详细说明**：
- 语法：xxx
- 表达：xxx
- 建议：xxx

---

（继续分析其他句子...）

## 🎯 行动建议
1. 具体建议1
2. 具体建议2
3. 具体建议3
"""


async def generate_report(
    audio_url: str,
    transcript: str,
    question_instruction: str
) -> str:
    """
    Generate analysis report using Volcengine Doubao multimodal LLM.
    
    Args:
        audio_url: Presigned URL to the audio file
        transcript: Transcribed text from ASR
        question_instruction: The question prompt
        
    Returns:
        Markdown formatted analysis report
    """
    # TODO: Implement actual Volcengine Doubao API call
    # For now, return a mock response
    
    if not settings.VOLCENGINE_API_KEY:
        # Mock response for development
        return generate_mock_report(transcript, question_instruction)
    
    # Actual implementation would use volcengine SDK:
    # from volcenginesdkarkruntime import Ark
    # client = Ark(api_key=settings.VOLCENGINE_API_KEY)
    # response = client.chat.completions.create(
    #     model="doubao-1.5-pro",
    #     messages=[
    #         {
    #             "role": "user",
    #             "content": [
    #                 {"type": "audio_url", "audio_url": {"url": audio_url}},
    #                 {"type": "text", "text": SCORING_PROMPT.format(
    #                     question_instruction=question_instruction,
    #                     transcript=transcript
    #                 )}
    #             ]
    #         }
    #     ]
    # )
    # return response.choices[0].message.content
    
    return generate_mock_report(transcript, question_instruction)


def generate_mock_report(transcript: str, question_instruction: str) -> str:
    """Generate a mock report for development."""
    return f"""# TOEFL Speaking 分析报告

## 📊 总体评分
- **预估分数**: 23/30 (等级: Good)
- **Delivery**: 7/10 - 语速适中，部分停顿略显不自然
- **Language Use**: 8/10 - 语法基本正确，词汇使用得当
- **Topic Development**: 8/10 - 论点清晰，有具体例证

## 💡 一句话总结
> 逻辑清晰，论点有力。建议改进连接词使用和学术词汇的丰富度。

## 📝 逐句分析

### 句子 1
> 原文：I believe taking a gap year is beneficial for students.

**评价**：✅ 优秀

**详细说明**：
- 语法：正确使用动名词作主语
- 表达：使用了 "beneficial" 这个学术词汇，很好
- 建议：可以继续保持这种正式的学术表达风格

---

### 句子 2
> 原文：It allows them to gain real-world experience and achieve financial independence.

**评价**：✅ 优秀

**详细说明**：
- 语法：并列结构使用正确
- 表达：具体的论据支持观点
- 建议：很好地使用了具体的短语如 "real-world experience"

---

### 句子 3
> 原文：Additionally, they can gain career clarity before committing to a specific field of study.

**评价**：⚡ 可改进

**Native 版本**：Furthermore, this period allows students to gain valuable career clarity before making a significant commitment to a particular field of study.

**详细说明**：
- 语法：基本正确
- 表达："Additionally" 可以用更正式的 "Furthermore" 或 "Moreover" 替换
- 建议：增加更多修饰词使表达更丰富

---

### 句子 4
> 原文：So, I agree with this statement.

**评价**：✅ 优秀

**详细说明**：
- 语法：简洁有力
- 表达：直接明了的结论
- 建议：完美的结尾，保持简洁是口语考试的好策略

## 🎯 行动建议
1. **丰富连接词**: 尝试使用更多样的过渡词，如 "Furthermore", "Moreover", "In addition"
2. **增加具体例子**: 可以加入个人经历或具体案例来支持论点
3. **练习语调变化**: 在表达重点时适当提高语调，增强表达效果

---
*分析时间: {transcript[:20]}...*
*题目: {question_instruction[:50]}...*
"""
