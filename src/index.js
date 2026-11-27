
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

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      env.ASSETS
    ) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        error: "فقط POST مجاز است."
      }), { status: 405, headers });
    }

    try {
      const body = await request.json();
      const { prompt, action } = body;

      if (typeof prompt !== "string" || !prompt.trim()) {
        return new Response(JSON.stringify({
          error: "لطفاً توضیحات را بنویس."
        }), { status: 400, headers });
      }

      if (!env.AI) {
        throw new Error("اتصال هوش مصنوعی پیدا نشد.");
      }

      // موتور ساخت تصویر با بهبود دستور کاربر
      if (action === "image") {

        // تبدیل توضیحات به دستور تصویری دقیق انگلیسی
        const improved = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are an expert image prompt translator. Convert the user's image request into one precise, detailed English image-generation prompt. Preserve the user's exact subject, gender, age appearance, number of people, clothing, hairstyle, colors, actions, setting and art style. Never change a male character into a female character or a female character into a male character. Never replace the requested subject with another subject. Do not invent extra people. If the user requests a boy, clearly describe a male boy with masculine facial features. If the user requests a girl, clearly describe a female girl. Keep all requested details. Output only the final English prompt, without explanations."
              },
              {
                role: "user",
                content: prompt.slice(0, 1800)
              }
            ],
            max_tokens: 300,
            temperature: 0.1
          }
        );

        const finalPrompt =
          (improved.response || prompt).trim().slice(0, 2000);

        // تولید تصویر
        const result = await env.AI.run(
          "@cf/black-forest-labs/flux-1-schnell",
          {
            prompt: finalPrompt,
            steps: 8
          }
        );

        if (!result || !result.image) {
          throw new Error("تصویر تولید نشد. دوباره تلاش کن.");
        }

        return new Response(JSON.stringify({
          image: "data:image/jpeg;base64," + result.image,
          promptUsed: finalPrompt
        }), { headers });
      }

      // گفتگوی متنی
      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: "تو آرش AI هستی؛ یک دستیار هوشمند و دوستانه. همیشه به فارسی روان پاسخ بده، مگر اینکه کاربر زبان دیگری بخواهد. فقط به سؤال واقعی کاربر پاسخ بده. هشتگ، تبلیغات و متن بی‌ربط تولید نکن. پیام کاربر را تکرار نکن. پاسخ‌ها طبیعی و دقیق باشند."
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
