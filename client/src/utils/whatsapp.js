/**
 * Build a bilingual WhatsApp clarification message.
 * English first, Roman Urdu below — clean, copy-paste ready.
 */
export function buildWhatsAppMessage(order) {
  const name = order.customerName || 'Customer';
  const gaps = order.missingDetails ?? [];
  const gapList = gaps.map((g) => `  • ${g}`).join('\n');
  const gapListUrdu = gaps.map((g) => `  • ${g}`).join('\n'); // items stay in English

  const orderId = order.orderId;

  return `📋 *PrintFlow AI — Order Clarification*
Order ID: ${orderId}

Hi ${name},

Thank you for your order! To proceed, we need a few more details:

${gapList}

Please reply with the above information and we'll get started right away.

---

🖨️ *PrintFlow AI — Order Clarification (Roman Urdu)*
Order ID: ${orderId}

Assalam o Alaikum ${name},

Aapka order receive ho gaya, shukriya! Lekin kuch details abhi missing hain:

${gapListUrdu}

Yeh information bhej dein aur hum aapka kaam shuru kar denge! ✅

— PrintFlow Print Shop`;
}
