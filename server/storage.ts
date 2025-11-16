import { type User, type InsertUser, type Claim, type InsertClaim, users, claims } from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Claim operations
  getAllClaims(): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | undefined>;
  getClaimByGladstoneRef(gladstoneRef: string): Promise<Claim | undefined>;
  getClaimByPolicyNumber(policyNumber: string): Promise<Claim | undefined>;
  findClaimsByClientRefs(clientRefs: string[]): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, claim: Partial<InsertClaim>): Promise<Claim | undefined>;
  upsertClaimByGladstoneRef(claim: InsertClaim): Promise<Claim>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Claim operations
  async getAllClaims(): Promise<Claim[]> {
    return await db.select().from(claims).orderBy(claims.notificationReceivedAt);
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    const result = await db.select().from(claims).where(eq(claims.id, id)).limit(1);
    return result[0];
  }

  async getClaimByGladstoneRef(gladstoneRef: string): Promise<Claim | undefined> {
    const result = await db.select().from(claims).where(eq(claims.gladstoneRef, gladstoneRef)).limit(1);
    return result[0];
  }

  async getClaimByPolicyNumber(policyNumber: string): Promise<Claim | undefined> {
    const result = await db.select().from(claims).where(eq(claims.policyNumber, policyNumber)).limit(1);
    return result[0];
  }

  async findClaimsByClientRefs(clientRefs: string[]): Promise<Claim[]> {
    if (!clientRefs || clientRefs.length === 0) {
      return [];
    }
    
    // Find all claims that have any overlapping client refs
    const allClaims = await db.select().from(claims);
    
    return allClaims.filter(claim => {
      if (!claim.clientRefs || claim.clientRefs.length === 0) {
        return false;
      }
      // Check if there's any overlap
      return claim.clientRefs.some(ref => clientRefs.includes(ref));
    });
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const result = await db.insert(claims).values(claim).returning();
    return result[0];
  }

  async updateClaim(id: string, claim: Partial<InsertClaim>): Promise<Claim | undefined> {
    const result = await db.update(claims).set(claim).where(eq(claims.id, id)).returning();
    return result[0];
  }

  async upsertClaimByGladstoneRef(claim: InsertClaim): Promise<Claim> {
    let existing: Claim | undefined;
    
    // Strategy: Try to find existing claim using multiple identifiers in order of preference
    // 1. Gladstone ref (most specific)
    if (claim.gladstoneRef) {
      existing = await this.getClaimByGladstoneRef(claim.gladstoneRef);
      if (existing) {
        console.log(`✓ Found existing claim by Gladstone ref: ${claim.gladstoneRef}`);
      }
    }
    
    // 2. Policy number (fallback when no Gladstone ref)
    if (!existing && claim.policyNumber) {
      existing = await this.getClaimByPolicyNumber(claim.policyNumber);
      if (existing) {
        console.log(`✓ Found existing claim by policy number: ${claim.policyNumber}`);
      }
    }
    
    // 3. Client refs (last resort - check for overlapping refs)
    if (!existing && claim.clientRefs && claim.clientRefs.length > 0) {
      const potentialMatches = await this.findClaimsByClientRefs(claim.clientRefs);
      
      if (potentialMatches.length > 0) {
        console.warn(`Found ${potentialMatches.length} existing claim(s) with overlapping client refs`);
        console.warn(`Existing claims: ${potentialMatches.map(c => c.gladstoneRef || c.policyNumber).join(', ')}`);
        console.warn(`Shared client refs: ${claim.clientRefs.join(', ')}`);
        
        // Use the first match as the existing claim to merge into
        existing = potentialMatches[0];
        console.warn(`Merging into existing claim: ${existing.gladstoneRef || existing.policyNumber}`);
      }
    }
    
    if (existing) {
      // Merge data: keep existing values, update with new non-null values
      // Union client refs to avoid duplicates
      const existingRefs = existing.clientRefs || [];
      const newRefs = claim.clientRefs || [];
      const mergedRefs = Array.from(new Set([...existingRefs, ...newRefs]));
      
      const merged = {
        ...claim,
        // Prefer new Gladstone ref if provided, otherwise keep existing
        gladstoneRef: claim.gladstoneRef || existing.gladstoneRef,
        // Prefer new policy number if provided, otherwise keep existing
        policyNumber: claim.policyNumber || existing.policyNumber,
        clientRefs: mergedRefs.length > 0 ? mergedRefs : null,
        notificationReceivedAt: claim.notificationReceivedAt || existing.notificationReceivedAt,
        surveyDate: claim.surveyDate || existing.surveyDate,
        surveyDateFixedAt: claim.surveyDateFixedAt || existing.surveyDateFixedAt,
        plaSentToRonnieAt: claim.plaSentToRonnieAt || existing.plaSentToRonnieAt,
        branch: claim.branch || existing.branch,
        insurer: claim.insurer || existing.insurer,
        consignee: claim.consignee || existing.consignee,
        commodity: claim.commodity || existing.commodity,
      };
      
      return (await this.updateClaim(existing.id, merged))!;
    } else {
      return await this.createClaim(claim);
    }
  }
}

export const storage = new DbStorage();
