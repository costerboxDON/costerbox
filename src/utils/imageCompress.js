/* src/utils/imageCompress.js
 *
 * Client-side image optimizer for admin uploads. Resizes the image and
 * re-encodes it as JPEG in the browser BEFORE it is sent to Firebase Storage,
 * so large camera files / PNGs never hit the site and pages load faster.
 *
 * Usage: const small = await compressImage(file, { maxEdge: 1600 });
 *        await uploadBytes(ref, small);
 */

const toBlob = (canvas, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

export async function compressImage(
    file,
    { maxEdge = 1600, quality = 0.82, minQuality = 0.6, maxBytes = 350 * 1024 } = {}
) {
    // Only touch raster images; leave everything else (svg, gif, video...) alone.
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
    if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file;

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; // JPEG has no alpha; flatten PNG transparency on white
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        if (bitmap.close) bitmap.close();

        let q = quality;
        let blob = await toBlob(canvas, q);
        while (blob && blob.size > maxBytes && q > minQuality) {
            q = Math.max(minQuality, q - 0.06);
            blob = await toBlob(canvas, q);
        }

        // Nothing gained: keep the original JPEG untouched.
        if (!blob || (file.type === 'image/jpeg' && scale === 1 && blob.size >= file.size)) return file;

        const baseName = (file.name || 'image').replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (err) {
        console.warn('Image compression failed, uploading original:', err);
        return file;
    }
}
