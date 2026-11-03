const authBaseURL = () => {
  const url = process.env.AUTH_BASE_URL;

  if (!url) {
    throw new Error("AUTH_BASE_URL is missing.");
  }

  return url.replace(/\/+$/, "");
};

let jwks;

const getJWKS = async () => {
  if (!jwks) {
    const { createRemoteJWKSet } = await import("jose");

    jwks = createRemoteJWKSet(
      new URL("/api/auth/jwks", `${authBaseURL()}/`)
    );
  }

  return jwks;
};

const requireAuth = async (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const { jwtVerify } = await import("jose");

    const baseURL = authBaseURL();

    const { payload } = await jwtVerify(token, await getJWKS(), {
      issuer: baseURL,
      audience: baseURL,
    });

    if (!payload.sub || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id: String(payload.sub),
      email: String(payload.email),
      name: payload.name || "Reader",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = requireAuth;