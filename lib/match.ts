/**
 * Entity matching logic using string similarity
 */

interface Entity {
  internalId: string
  name: string
}

interface MatchResult {
  matchedEntity: Entity | null
  confidence: number
  allMatches: Array<{ entity: Entity; similarity: number }> // Added for transparency
}

/**
 * Finds the best match for a given name in a list of entities
 */
export function findBestMatch(name: string, entities: Entity[]): MatchResult {
  // Add timestamp for debugging
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Starting matching process for: "${name}"`)

  if (!name || entities.length === 0) {
    console.log(`[${timestamp}] No name or empty entities list, returning null match`)
    return { matchedEntity: null, confidence: 0, allMatches: [] }
  }

  // Special case for "Unknown Insured"
  if (name === "Unknown Insured") {
    console.log(`[${timestamp}] Input is "Unknown Insured", returning null match`)
    return { matchedEntity: null, confidence: 0, allMatches: [] }
  }

  const normalizedName = normalizeString(name)
  console.log(`[${timestamp}] Normalized input name: "${normalizedName}"`)

  const matches = entities.map((entity) => {
    const normalizedEntityName = normalizeString(entity.name)
    const similarity = calculateStringSimilarity(normalizedName, normalizedEntityName)
    return { entity, similarity, normalizedEntityName }
  })

  // Log all normalized entity names for debugging
  console.log(`[${timestamp}] Normalized entity names:`)
  matches.slice(0, 5).forEach((match) => {
    console.log(`  - "${match.entity.name}" -> "${match.normalizedEntityName}"`)
  })

  // Sort matches by similarity score (descending)
  matches.sort((a, b) => b.similarity - a.similarity)

  // Log top matches for debugging
  console.log(`[${timestamp}] Top 5 matches:`)
  matches.slice(0, 5).forEach((match, index) => {
    console.log(`  ${index + 1}. ${match.entity.name} (${match.entity.internalId}): ${match.similarity}`)
  })

  // Return the best match and all matches for transparency
  return {
    matchedEntity: matches[0]?.entity || null,
    confidence: matches[0]?.similarity || 0,
    allMatches: matches.map(({ entity, similarity }) => ({ entity, similarity })),
  }
}

/**
 * Normalizes a string for comparison by removing special characters,
 * extra spaces, and converting to lowercase
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim()
}

/**
 * Calculates the similarity between two strings using Levenshtein distance
 * Returns a value between 0 and 1, where 1 means identical strings
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  // If either string is empty, return 0
  if (!str1.length || !str2.length) return 0

  // If strings are identical, return 1
  if (str1 === str2) return 1

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(str1, str2)

  // Calculate similarity as 1 - (distance / max length)
  // This gives a value between 0 and 1
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - distance / maxLength
}

/**
 * Calculates the Levenshtein distance between two strings
 * This measures the minimum number of single-character edits required
 * to change one string into the other
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize the first row and column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // Deletion
        dp[i][j - 1] + 1, // Insertion
        dp[i - 1][j - 1] + cost, // Substitution
      )
    }
  }

  // Return the bottom-right cell
  return dp[m][n]
}
