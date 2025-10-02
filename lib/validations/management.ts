import * as z from "zod"

export const branchSchema = z.object({
  branch_name: z.string().min(3, "Branch name must be at least 3 characters"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5, "Address must be at least 5 characters"),
})

export const carSchema = z.object({
  plate_number: z.string().min(6, "Plate number must be at least 6 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  capacity_kg: z.number().min(0, "Capacity must be positive"),
  status: z.enum(["available", "in-use", "maintenance"]),
  branch_id: z.string().min(1, "Branch must be selected"),
})

export const driverSchema = z.object({
  full_name: z.string().min(3, "Full name must be at least 3 characters"),
  phone: z.string().regex(/^\+?[0-9]{10,}$/, "Invalid phone number format"),
  license_number: z.string().min(5, "License number must be at least 5 characters"),
  assigned_car: z.string().nullable(),
  branch_id: z.string().min(1, "Branch must be selected"),
})