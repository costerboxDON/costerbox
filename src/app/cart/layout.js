/* src/app/cart/layout.js */
export const metadata = {
    title: 'Your Cart | Costerbox',
    description: 'Review and modify your cart items before checkout.'
};

export default function CartLayout({ children }) {
    return (
        <>
            {children}
        </>
    );
}
