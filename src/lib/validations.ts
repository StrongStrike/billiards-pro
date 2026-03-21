import { z } from "zod";

export const lineItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const startSessionSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  note: z.string().trim().max(200).optional(),
});

export const stopSessionSchema = z.object({
  note: z.string().trim().max(200).optional(),
});

export const orderSchema = z.object({
  tableId: z.string().optional(),
  sessionId: z.string().optional(),
  note: z.string().trim().max(200).optional(),
  items: z.array(lineItemSchema).min(1),
});

export const counterSaleSchema = z.object({
  customerName: z.string().trim().max(80).optional(),
  note: z.string().trim().max(200).optional(),
  items: z.array(lineItemSchema).min(1),
});

export const cashMovementSchema = z.object({
  type: z.enum(["service_in", "service_out", "expense", "cash_drop", "change"]),
  amount: z.number().int().positive(),
  reason: z.string().trim().min(4).max(180),
});

export const billAdjustmentSchema = z
  .object({
    sessionId: z.string().min(1),
    type: z.enum(["discount", "compliment", "free_minutes", "manual_charge"]),
    amount: z.number().int().positive().optional(),
    minutes: z.number().int().positive().max(240).optional(),
    reason: z.string().trim().min(4).max(180),
  })
  .superRefine((value, context) => {
    if (value.type === "free_minutes") {
      if (!value.minutes) {
        context.addIssue({
          code: "custom",
          path: ["minutes"],
          message: "Bepul daqiqa miqdorini kiriting",
        });
      }
      return;
    }

    if (!value.amount) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Summani kiriting",
      });
    }
  });

export const reservationSchema = z
  .object({
    tableId: z.string().min(1),
    customerName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
    guests: z.number().int().positive().max(16),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "Bron yakun vaqti boshlanishdan keyin bo'lishi kerak",
    path: ["endAt"],
  });

export const reservationPatchSchema = z.object({
  customerName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  guests: z.number().int().positive().max(16).optional(),
  startAt: z.iso.datetime().optional(),
  endAt: z.iso.datetime().optional(),
  note: z.string().trim().max(200).optional(),
  status: z.enum(["scheduled", "arrived", "completed", "cancelled"]).optional(),
  convertToSession: z.boolean().optional(),
}).refine(
  (value) =>
    !value.startAt ||
    !value.endAt ||
    new Date(value.endAt).getTime() > new Date(value.startAt).getTime(),
  {
    message: "Bron yakun vaqti boshlanishdan keyin bo'lishi kerak",
    path: ["endAt"],
  },
);

export const settingsSchema = z.object({
  clubName: z.string().trim().min(2).max(80).optional(),
  currency: z.string().trim().min(3).max(6).optional(),
  timezone: z.string().trim().min(3).max(60).optional(),
  operatorName: z.string().trim().min(2).max(80).optional(),
  operatorEmail: z.email().optional(),
  standardHourlyRate: z.number().int().positive().optional(),
  vipHourlyRate: z.number().int().positive().optional(),
  showActivityChart: z.boolean().optional(),
  showRightRail: z.boolean().optional(),
  tables: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(2).max(40),
        type: z.enum(["standard", "vip"]),
      }),
    )
    .optional(),
});

export const inventoryPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("product"),
    productId: z.string(),
    name: z.string().trim().min(2).max(80).optional(),
    price: z.number().int().nonnegative().optional(),
    costPrice: z.number().int().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    threshold: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("stock"),
    productId: z.string(),
    type: z.enum(["in", "out", "correction"]),
    quantity: z.number().int(),
    reason: z.string().trim().min(2).max(120),
  }).refine((value) => value.type === "correction" || value.quantity > 0, {
    message: "Kirim va chiqim uchun miqdor musbat bo'lishi kerak",
    path: ["quantity"],
  }),
]);
