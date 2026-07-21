// Audio file upload handling via Multer — stores episode audio files in server/uploads/
import multer from "multer";
import path from "path";

// Disk storage config — files saved as "episode-{timestamp}.{ext}"
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `episode-${Date.now()}${ext}`);
  },
});

// Only allow audio file types
const fileFilter = (req, file, cb) => {
  const allowed = [".mp3", ".wav", ".m4a", ".ogg", ".aac"];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

// Max upload size: 50MB
export const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// Converts a stored filename to a URL path served by Express static middleware
export function getUploadUrl(filename) {
  return `/uploads/${filename}`;
}
