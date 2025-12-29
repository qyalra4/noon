// src/utils/arabicFonts.ts

// خط Amiri Regular (مقطع جزء من الخط - يمكن استبداله بالكامل)
export const amiriRegularBase64 = `
T1RUTwAJAIAAAwAQQ0ZGIG5T68AAAwIAAAAAAEFPUy8yOGfIbwAAAVgAAABgY21hcMbZB+gA
AAGQAAABEmdseWY1KzL+AAAB0AAAAx5oZWFkBPQJxQAAALwAAAA2aGhlYQdvBHUAAADUAAAA
JGhtdHgcVgWJAAABGAAAABZsb2NhAIEAUwAAAcAAAAAUbWF4cAASAAAAAAFwAAAAIG5hbWUf
0U8tAAAB8AAAAVJwb3N0/4gAFQAAA0gAAAAgAAEAAAABAADJfHpEXw889QALBAAAAAAA0eDE
LgAAAADR4MQuAAAAAAAAAAEAAQAAAAoAHgAsAAJERkxUAAgABAAAAAD//wAAAAAAAAAAAAAA
AAAAAA==
`;

// دالة لتحميل الخط عند الحاجة
let arabicFontLoaded = false;

export const loadArabicFont = async (): Promise<void> => {
  if (arabicFontLoaded) return;
  
  try {
    // طريقة بديلة: تحميل الخط من ملف إذا كان متوفراً
    const response = await fetch('/fonts/Amiri-Regular.ttf');
    if (response.ok) {
      const fontBlob = await response.blob();
      const reader = new FileReader();
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fontBlob);
      });
      
      arabicFontLoaded = true;
    }
  } catch (error) {
    console.warn('لم يتم تحميل الخط العربي من الملف، سيتم استخدام الخط البديل');
    // سنستخدم الخط البديل المضمن
    arabicFontLoaded = true;
  }
};

export const getArabicFont = () => amiriRegularBase64;
export const isArabicFontLoaded = () => arabicFontLoaded;