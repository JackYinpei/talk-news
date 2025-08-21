import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * OpenAI Responses API的代理端点
 * 根据请求类型选择结构化响应或文本响应
 * @param {Request} req - Next.js请求对象
 * @returns {Promise<NextResponse>} API响应
 */
export async function POST(req) {
  const body = await req.json();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (body.text?.format?.type === 'json_schema') {
    return await structuredResponse(openai, body);
  } else {
    return await textResponse(openai, body);
  }
}

/**
 * 处理结构化响应请求
 * 使用OpenAI的responses.parse方法解析结构化数据
 * @param {OpenAI} openai - OpenAI客户端实例
 * @param {Object} body - 请求体数据
 * @returns {Promise<NextResponse>} 解析后的响应或错误信息
 */
async function structuredResponse(openai, body) {
  try {
    const response = await openai.responses.parse({
      ...body,
      stream: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 }); 
  }
}

/**
 * 处理文本响应请求
 * 使用OpenAI的responses.create方法创建文本响应
 * @param {OpenAI} openai - OpenAI客户端实例
 * @param {Object} body - 请求体数据
 * @returns {Promise<NextResponse>} 创建的响应或错误信息
 */
async function textResponse(openai, body) {
  try {
    const response = await openai.responses.create({
      ...body,
      stream: false,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error('responses proxy error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}