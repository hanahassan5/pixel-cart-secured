import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { AppError } from "./appError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory: backend/uploads
export const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// Supported media types configuration (currently focused on images)
export const TYPE_CONFIG = {
    images: {
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
        maxSize: 5 * 1024 * 1024 // 5 MB limit
    }
};

// Dangerous executable and script extensions explicitly denied
const FORBIDDEN_EXTENSIONS = new Set([
    ".js", ".mjs", ".cjs", ".php", ".phtml", ".exe", ".bat", ".cmd",
    ".sh", ".html", ".htm", ".svg", ".asp", ".aspx", ".jsp", ".cgi", ".py", ".pl"
]);

export const getUploadUrl = (folder, filename) => {
    const cleanFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanFile = path.basename(filename);
    return `/uploads/${cleanFolder}/${cleanFile}`;
};

export const getUploadPath = (folder, filename) => {
    const cleanFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanFile = path.basename(filename);
    return path.resolve(UPLOADS_ROOT, cleanFolder, cleanFile);
};

export const deleteUploadedFile = async (filePath) => {
    try {
        if (!filePath || typeof filePath !== "string") {
            return false;
        }

        // Ignore external URLs (e.g. Unsplash seed URLs)
        if (/^https?:\/\//i.test(filePath)) {
            return false;
        }

        // Strip leading slashes and optional 'uploads/' prefix
        let relativePath = filePath.trim().replace(/^[/\\]+/, "");
        if (relativePath.toLowerCase().startsWith("uploads/") || relativePath.toLowerCase().startsWith("uploads\\")) {
            relativePath = relativePath.slice(8);
        }

        const absolutePath = path.resolve(UPLOADS_ROOT, relativePath);

        // Robust path boundary check: ensures path is strictly inside UPLOADS_ROOT
        const relative = path.relative(UPLOADS_ROOT, absolutePath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            console.warn(`[Security] Path Traversal blocked in deleteUploadedFile: ${filePath}`);
            return false;
        }

        if (fs.existsSync(absolutePath)) {
            const stat = await fs.promises.stat(absolutePath);
            if (stat.isFile()) {
                await fs.promises.unlink(absolutePath);
                return true;
            }
        } else {
            console.warn(`[Warning] File to delete does not exist on disk: ${absolutePath}`);
        }

        return false;
    } catch (error) {
        console.warn(`[Warning] Failed to delete file (${filePath}):`, error.message);
        return false;
    }
};

export const createUploader = ({ folder = "products", type = "images", limits = {} } = {}) => {
    if (!folder || typeof folder !== "string") {
        throw new Error("createUploader requires a developer-controlled 'folder' string");
    }

    const typeConfig = TYPE_CONFIG[type];
    if (!typeConfig) {
        throw new Error(`Unsupported uploader type '${type}'. Supported types: ${Object.keys(TYPE_CONFIG).join(", ")}`);
    }

    // Sanitize folder name so it cannot contain traversal elements
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const destinationDir = path.resolve(UPLOADS_ROOT, safeFolder);

    // Ensure target upload directory exists
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, destinationDir);
        },
        filename: (req, file, cb) => {
            // Generate safe, unique identifier using UUID
            const uniqueId = crypto.randomUUID();
            const originalExt = path.extname(file.originalname).toLowerCase();
            const safeExt = typeConfig.extensions.includes(originalExt) ? originalExt : typeConfig.extensions[0];
            cb(null, `${uniqueId}${safeExt}`);
        }
    });

    const fileFilter = (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        // 1. Prohibit dangerous extensions
        if (FORBIDDEN_EXTENSIONS.has(ext)) {
            return cb(new AppError(`File type not allowed: ${ext}`, 400), false);
        }

        // 2. Validate extension against type configuration
        if (!typeConfig.extensions.includes(ext)) {
            return cb(new AppError(`Invalid file extension for ${type}. Allowed: ${typeConfig.extensions.join(", ")}`, 400), false);
        }

        // 3. Validate MIME type
        if (!typeConfig.mimeTypes.includes(file.mimetype)) {
            return cb(new AppError(`Invalid MIME type '${file.mimetype}' for ${type}`, 400), false);
        }

        cb(null, true);
    };

    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: limits.fileSize ?? typeConfig.maxSize,
            ...limits
        }
    });
};

// Pre-configured uploader for products
export const productUploader = createUploader({ folder: "products", type: "images" });

export default createUploader;
