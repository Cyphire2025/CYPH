import { z } from "zod";

const professionalProfileSchema = z.object({
  headline: z.string().max(140).optional(),
  valueProposition: z.string().max(280).optional(),
  expertiseLevel: z.enum(["starter", "intermediate", "advanced", "expert"]).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  availability: z.enum(["open", "limited", "booked", "not-looking"]).optional(),
  responseSla: z.string().max(64).optional(),
  domains: z.array(z.enum(["tech", "education", "event", "architecture"])).max(4).optional(),
  serviceLines: z.array(z.string().max(64)).max(30).optional(),
  toolsAndStack: z.array(z.string().max(64)).max(40).optional(),
  engagementModes: z.array(z.string().max(64)).max(20).optional(),
  certifications: z.array(z.string().max(120)).max(20).optional(),
  achievements: z.array(z.string().max(160)).max(20).optional(),
  portfolioHighlights: z.array(z.string().max(160)).max(20).optional(),
  domainDetails: z.object({
    tech: z.object({
      focusAreas: z.array(z.string().max(64)).max(20).optional(),
      primaryStack: z.array(z.string().max(64)).max(30).optional(),
      deliverables: z.array(z.string().max(80)).max(20).optional(),
      proofPoints: z.string().max(500).optional(),
    }).optional(),
    education: z.object({
      focusAreas: z.array(z.string().max(64)).max(20).optional(),
      primaryStack: z.array(z.string().max(64)).max(30).optional(),
      deliverables: z.array(z.string().max(80)).max(20).optional(),
      proofPoints: z.string().max(500).optional(),
    }).optional(),
    event: z.object({
      focusAreas: z.array(z.string().max(64)).max(20).optional(),
      primaryStack: z.array(z.string().max(64)).max(30).optional(),
      deliverables: z.array(z.string().max(80)).max(20).optional(),
      proofPoints: z.string().max(500).optional(),
    }).optional(),
    architecture: z.object({
      focusAreas: z.array(z.string().max(64)).max(20).optional(),
      primaryStack: z.array(z.string().max(64)).max(30).optional(),
      deliverables: z.array(z.string().max(80)).max(20).optional(),
      proofPoints: z.string().max(500).optional(),
    }).optional(),
  }).optional(),
}).optional();

export const updateMeSchema = z.object({
  name: z.string().min(2).max(40).optional(),
  country: z.string().max(64).optional(),
  phone: z.string().max(32).optional(),
  skills: z.union([
    z.array(z.string().max(32)),
    z.string(), // allow comma-separated string
  ]).optional(),
  bio: z.string().max(300).optional(),
  professionalProfile: professionalProfileSchema,
});

export const saveProjectsSchema = z.object({
  projects: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      link: z.string().optional(),
    })
  ),
});

export const uploadProjectMediaSchema = z.object({});

export const updateProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  link: z.string().optional(),
});

export const setUserPlanSchema = z.object({
  plan: z.enum(["free", "plus", "ultra"]),
});
