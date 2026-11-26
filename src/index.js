
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
        throw new Error("اتصال هوش مصنوعی پیدا نشد.");
      }

      const fullPrompt =
        "تو آرش AI هستی، یک دستیار هوشمند و دوستانه. " +
        "همیشه به زبان فارسی روان پاسخ بده، مگر اینکه کاربر زبان دیگری بخواهد. " +
        "فقط به پیام فعلی کاربر پاسخ بده. " +
        "متن کاربر را بی‌دلیل تکرار نکن و اطلاعات نامربوط نساز. " +
        "پاسخ را واضح و مفید بنویس.\n\n" +
        "پیام کاربر:\n" + prompt.slice(0, 4000) +
        "\n\nپاسخ آرش AI:";

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          prompt: fullPrompt,
          max_tokens: 512,
          temperature: 0.3,
          repetition_penalty: 1.2
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
          
