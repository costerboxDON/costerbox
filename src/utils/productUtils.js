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


/**
 * Rich-text editors (Quill, pasted Word/Docs text) store spaces as &nbsp;.
 * Non-breaking spaces stop the browser wrapping between words, so
 * `overflow-wrap: break-word` ends up chopping a word mid-way ("cost" / "erbox").
 * Turn them back into normal spaces and strip inline white-space/word-break styles.
 */
export const cleanRichText = (html) => {
    if (!html || typeof html !== 'string') return html || '';
    return html
        .replace(/&nbsp;|&#160;|&#xA0;| /gi, ' ')
        .replace(/­|&shy;/gi, '')
        .replace(/\s*(white-space|word-break|overflow-wrap|word-wrap|hyphens)\s*:[^;"']*;?/gi, '');
};
