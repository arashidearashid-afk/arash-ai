
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

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: "تو آرش AI هستی؛ یک دستیار هوشمند و دوستانه. همیشه به فارسی روان پاسخ بده، مگر اینکه کاربر زبان دیگری بخواهد. فقط به سؤال واقعی کاربر پاسخ بده. هشتگ، تبلیغات، نام کاربری و متن بی‌ربط تولید نکن. پیام کاربر را تکرار نکن. پاسخ‌هایت طبیعی، دقیق و متناسب با سؤال باشند. اگر کاربر فقط سلام کرد، کوتاه و دوستانه سلام کن."
            },
            {
              role: "user",
              content: prompt.slice(0, 4000)
            }
          ],
          max_tokens: 512,
          temperature: 0.2,
          repetition_penalty: 1.1
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
