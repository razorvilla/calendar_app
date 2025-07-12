export default function TestTailwind() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-blue-600 mb-4">
                    Tailwind Test
                </h1>
                <p className="text-gray-700">
                    If you can see this text in blue and styled, Tailwind is working!
                </p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Button
                </button>
            </div>
        </div>
    );
}