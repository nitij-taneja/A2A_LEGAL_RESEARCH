// Simple test to verify API endpoints are working
const testEndpoints = async () => {
  console.log("Testing API endpoints...\n");
  
  // Test 1: Check if server is responding
  try {
    const response = await fetch("http://localhost:3000/api/trpc/auth.me");
    console.log("✓ Server is responding");
  } catch (error) {
    console.log("✗ Server connection failed:", error.message);
  }
};

testEndpoints();
