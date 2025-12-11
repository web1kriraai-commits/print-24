import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/**
 * Upload image for CKEditor or other general purposes
 * Returns the image URL
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: "No image file provided" 
      });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ 
        success: false,
        error: "Only image files are allowed" 
      });
    }

    // Upload to Cloudinary
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: "editor-images",
            resource_type: "image",
            transformation: [
              { quality: "auto" },
              { fetch_format: "auto" }
            ]
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await uploadStream();

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Failed to upload image" 
    });
  }
};


