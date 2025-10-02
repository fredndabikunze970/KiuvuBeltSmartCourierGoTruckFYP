import * as z from 'zod'

export const senderSchema = z.object({
  senderName: z.string().min(3, 'Name must be at least 3 characters'),
  senderPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  senderAddress: z.string().min(5, 'Address must be at least 5 characters'),
  originBranchId: z.string().min(1, 'Origin branch is required')
})

export const receiverSchema = z.object({
  receiverName: z.string().min(3, 'Name must be at least 3 characters'),
  receiverPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format'),
  receiverAddress: z.string().min(5, 'Address must be at least 5 characters'),
  destinationBranchId: z.string().min(1, 'Destination branch is required')
})

export const packageSchema = z.object({
  packageDescription: z.string().optional(),
  weight: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  dimensions: z.string().optional(),
  declaredValue: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  priority: z.enum(['normal', 'express', 'urgent']).default('normal'),
  deliveryFee: z.string().transform(val => parseFloat(val))
    .refine(val => val > 0, 'Delivery fee must be greater than 0')
})

export const packageFormSchema = z.object({
  ...senderSchema.shape,
  ...receiverSchema.shape,
  ...packageSchema.shape
})