/* src/utils/productUtils.js */

/**
 * Checks if a product is Active and available for sale to general public.
 * Draft, archived, or unpublished products return false and must only be visible in admin inventory.
 */
export const isProductActive = (p) => {
    if (!p) return false;
    
    // Explicit draft / unpublished flags
    if (p.isDraft === true || p.draft === true || p.published === false || p.isPublished === false) {
        return false;
    }
    
    // Normalize status string (defaults to 'Active' for legacy products)
    const status = String(p.status || 'Active').trim().toLowerCase();
    
    // Strict match against active
    return status === 'active';
};
