import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `episode-${Date.now()}${ext}`);
  },
});

const allowedExtensions = [".mp3", ".mpeg", ".wav", ".m4a", ".ogg", ".aac"];

function hasAudioMagic(buf) {
  if (buf.length < 4) return false;
  if (buf.subarray(0, 3).equals(Buffer.from("ID3"))) return true;
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  if (buf.subarray(0, 4).equals(Buffer.from("RIFF"))) return true;
  if (buf.subarray(0, 4).equals(Buffer.from("OggS"))) return true;
  if (buf.length >= 8 && buf.subarray(4, 8).equals(Buffer.from("ftyp"))) return true;
  if (buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0) return true;
  return false;
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Unsupported file type"));
  }

  const chunks = [];
  file.stream.on("data", (c) => chunks.push(c));
  file.stream.on("end", () => {
    const head = Buffer.concat(chunks).subarray(0, 12);
    if (!hasAudioMagic(head)) {
      return cb(new Error("File content is not a valid audio file"));
    }
    cb(null, true);
  });
  file.stream.on("error", (err) => cb(err));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

export function getUploadUrl(filename) {
  return `/uploads/${filename}`;
}
