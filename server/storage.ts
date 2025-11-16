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
    // First try to find by Gladstone ref (primary identifier)
    let existing = await this.getClaimByGladstoneRef(claim.gladstoneRef);
    
    // If not found by Gladstone ref, check for overlapping client refs
    if (!existing && claim.clientRefs && claim.clientRefs.length > 0) {
      const potentialMatches = await this.findClaimsByClientRefs(claim.clientRefs);
      
      if (potentialMatches.length > 0) {
        console.warn(`Found ${potentialMatches.length} existing claim(s) with overlapping client refs for new Gladstone ref ${claim.gladstoneRef}`);
        console.warn(`Existing claims: ${potentialMatches.map(c => c.gladstoneRef).join(', ')}`);
        console.warn(`Shared client refs: ${claim.clientRefs.join(', ')}`);
        
        // Use the first match as the existing claim to merge into
        existing = potentialMatches[0];
        console.warn(`Merging into existing claim: ${existing.gladstoneRef}`);
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
        // If we're merging into an existing claim with a different Gladstone ref,
        // keep the original Gladstone ref (it was created first)
        gladstoneRef: existing.gladstoneRef,
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
