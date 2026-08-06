// Audio file upload handling via Multer — stores episode audio files in server/uploads/
// Rejects non-audio files by validating BOTH the extension and the file's magic bytes,
// so a renamed .exe/.html etc. cannot be uploaded and served.
import multer from "multer";
import path from "path";

// Disk storage config — files saved as "episode-{timestamp}.{ext}"
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `episode-${Date.now()}${ext}`);
  },
});

// Only allow audio file types
const allowedExtensions = [".mp3", ".mpeg", ".wav", ".m4a", ".ogg", ".aac"];

// Cheap magic-byte sniffing for common audio containers:
//   MP3: "ID3" tag or MPEG frame sync (0xFFEx)
//   WAV: "RIFF"
//   Ogg: "OggS"
//   M4A/MP4/AAC-in-MP4: "ftyp" at offset 4
//   AAC ADTS: 0xFFFx sync word
function hasAudioMagic(buf) {
  if (buf.length < 4) return false;
  if (buf.subarray(0, 3).equals(Buffer.from("ID3"))) return true; // MP3 with ID3 tag
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;   // MPEG audio frame sync
  if (buf.subarray(0, 4).equals(Buffer.from("RIFF"))) return true; // WAV
  if (buf.subarray(0, 4).equals(Buffer.from("OggS"))) return true; // Ogg container
  if (buf.length >= 8 && buf.subarray(4, 8).equals(Buffer.from("ftyp"))) return true; // M4A/MP4
  if (buf[0] === 0xff && (buf[1] & 0xf0) === 0xf0) return true;    // AAC ADTS
  return false;
}

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Unsupported file type"));
  }

  // Peek the beginning of the file stream to verify it's really audio
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

// Max upload size: 50MB
export const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// Converts a stored filename to a canonical URL path used by the access-control layer
export function getUploadUrl(filename) {
  return `/uploads/${filename}`;
}
