import { NextResponse } from "next/server";

/**
 * 获取OpenAI实时会话token
 * 代理到OpenAI Realtime Sessions API创建新的会话
 * @returns {Promise<NextResponse>} 包含会话数据的响应或错误信息
 */
export async function GET() {
  try {
    // const response = await fetch(
    //   "https://api.openai.com/v1/realtime/sessions",
    //   {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       model: "gpt-4o-realtime-preview-2025-06-03",
    //     }),
    //   }
    // );
    // const data = await response.json();
    // return NextResponse.json(data);
    return NextResponse.json({client_secret: { value:"ek_68b2a59b898c8191a33eab4e9e661ee3"}});
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}