
export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    // نمایش سایت
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      env.ASSETS
    ) {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "روش درخواست پشتیبانی نمی‌شود."
        }),
        { status: 405, headers }
      );
    }

    try {
      const body = await request.json();
      const prompt = body.prompt;
      const action = body.action || "chat";

      if (
        typeof prompt !== "string" ||
        !prompt.trim()
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "لطفاً پیام خود را بنویس."
          }),
          { status: 400, headers }
        );
      }

      if (!env.AI) {
        throw new Error(
          "اتصال هوش مصنوعی Cloudflare پیدا نشد."
        );
      }

      // =================================
      // تولید تصویر از توضیحات متنی
      // =================================

      if (action === "image") {
        const improved = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            messages: [
              {
                role: "system",
                content:
                  "You are an expert image prompt engineer. Convert the user's request into a detailed English image-generation prompt. Preserve the exact subject, gender, age appearance, number of people, clothing, hairstyle, colors, pose, action, background and requested art style. Never change a male subject into a female subject or vice versa. Never replace the requested subject. Do not invent extra people or objects. Follow the user's instructions precisely. Output only the final image prompt."
              },
              {
                role: "user",
                content: prompt.slice(0, 1800)
              }
            ],
            max_tokens: 350,
            temperature: 0.1
          }
        );

        const finalPrompt = (
          improved.response || prompt
        ).trim().slice(0, 2000);

        const result = await env.AI.run(
          "@cf/black-forest-labs/flux-1-schnell",
          {
            prompt: finalPrompt,
            steps: 8
          }
        );

        if (!result || !result.image) {
          throw new Error(
            "تصویر تولید نشد. دوباره تلاش کن."
          );
        }

        let imageData = result.image;

        if (
          imageData instanceof Uint8Array ||
          imageData instanceof ArrayBuffer
        ) {
          const bytes =
            imageData instanceof Uint8Array
              ? imageData
              : new Uint8Array(imageData);

          let binary = "";

          for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(
              ...bytes.subarray(i, i + 8192)
            );
          }

          imageData = btoa(binary);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "تصویر آماده شد ✨",
            image: "data:image/png;base64," + imageData,
            promptUsed: finalPrompt
          }),
          { headers }
        );
      }

      // =================================
      // مغز چندزبانه آرش
      // =================================

      const systemPrompt = `
You are Arash AI, a helpful, intelligent,
friendly and multilingual assistant.

LANGUAGE:
- Automatically detect the language of every user message.
- Reply in the same language as the user's message.
- Support Persian, Arabic, English, Spanish, German,
French, Turkish, Russian, Italian, Japanese and other languages.
- If the user requests a different response language,
follow that request.
- Never mix languages unnecessarily.

TRANSLATION:
- Translate any text into the language requested by the user.
- Preserve meaning, tone, context and details.
- Do not summarize when a full translation is requested.
- If the target language is missing or unclear,
ask the user which language they want.

GENERAL ASSISTANCE:
- Answer naturally, accurately and clearly.
- Help with science, education, technology,
writing, everyday questions and problem solving.
- For programming, provide useful explanations
and complete code when appropriate.
- Do not invent facts or pretend to have performed actions.

MEDICAL AND NURSING ASSISTANCE:
- You are an educational medical information assistant,
not a licensed doctor or nurse.
- Explain symptoms, medical terms, laboratory results,
medicines and general care in understandable language.
- Do not claim a definite diagnosis from symptoms alone.
- Do not prescribe medicines or change doses.
- Explain possible medicine risks and interactions carefully.
- Encourage consultation with a qualified clinician
for diagnosis and treatment decisions.
- For severe chest pain, difficulty breathing,
stroke symptoms, severe bleeding, unconsciousness
or other life-threatening signs, advise immediate
emergency medical care.
- Protect the user's privacy and do not request
unnecessary personal information.

IMPORTANT:
- Be respectful, calm and helpful.
- Do not add advertisements or irrelevant hashtags.
- Do not claim that you created a video, song
or edited an uploaded photo unless a real connected
service actually performed that task.
- Keep answers clear and useful.
`;

      // =================================
      // اجرای گفت‌وگوی متنی
      // =================================

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt.slice(0, 6000)
            }
          ],
          max_tokens: 700,
          temperature: 0.3,
          repetition_penalty: 1.1
        }
      );

      const reply =
        result.response ||
        "متأسفم، فعلاً نتوانستم پاسخ مناسبی تولید کنم.";

      return new Response(
        JSON.stringify({
          success: true,
          reply
        }),
        { headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error.message ||
            "خطای ناشناخته در سرور آرش AI"
        }),
        {
          status: 500,
          headers
        }
     
