import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

async function createToken() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  const url = `https://generativelanguage.googleapis.com/v1beta/projects/${projectId}/locations/global:generateToken`;

  const res = await client.request({
    url,
    method: 'POST',
    data: {
      "model": "models/gemini-2.5-flash-preview-native-audio-dialog",
      "role": "writer",
      "uses": [
        {
          "permission": "any"
        }
      ]
    }
  });

  return res.data;
}

export async function GET() {
  try {
    const token = await createToken();
    return NextResponse.json(token);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
