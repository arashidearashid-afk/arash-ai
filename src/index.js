

export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        error: "فقط POST مجاز است."
      }), { status: 405, headers });
    }

    try {
      const { prompt } = await request.json();

      if (typeof prompt !== "string" || !prompt.trim()) {
        return new Response(JSON.stringify({
          error: "پیام خالی است."
        }), { status: 400, headers });
      }

      if (!env.AI) {
        throw new Error("اتصال Workers AI با نام AI پیدا نشد.");
      }

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          prompt: prompt.slice(0, 4000),
          max_tokens: 512
        }
      );

      return new Response(JSON.stringify({
        reply: result.response || "پاسخی دریافت نشد."
      }), { headers });

    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message || "خطای ناشناخته در سرور"
      }), { status: 500, headers });
    }
  }
};
        
