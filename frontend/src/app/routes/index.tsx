import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Lazy loaded routes
const CalendarPage = lazy(() => import('./CalendarPage'));

// Loading fallback
const LoadingFallback = () => (
    <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-primary-600 animate-pulse">Loading...</div>
    </div>
);

// Create the router
const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <Suspense fallback={<LoadingFallback />}>
                <CalendarPage />
            </Suspense>
        ),
    },
]);

// Router provider component
const AppRouter = () => {
    return <RouterProvider router={router} />;
};

export default AppRouter;