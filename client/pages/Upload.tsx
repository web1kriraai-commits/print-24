import React, { useState, useRef, useEffect } from "react";
import {
  Upload as UploadIcon,
  File as FileIcon,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Info,
  Ruler,
  Shield,
  Download,
  Settings,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LogIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import BackButton from "../components/BackButton";

// Guides Overlay Component
const GuidesOverlay: React.FC<{
  width?: string;
  height?: string;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  bleedArea?: { top: number; bottom: number; left: number; right: number };
}> = ({
  width = "100%",
  height = "100%",
  safeArea = { top: 10, bottom: 10, left: 10, right: 10 },
  bleedArea = { top: 15, bottom: 15, left: 15, right: 15 },
}) => {
  const [showGuides, setShowGuides] = useState(true);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Toggle Button */}
      <div className="absolute -top-8 right-0 pointer-events-auto">
        <button
          onClick={() => setShowGuides(!showGuides)}
          className="bg-cream-700 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1 hover:bg-cream-800 transition-colors"
        >
          {showGuides ? <EyeOff size={12} /> : <Eye size={12} />}
          {showGuides ? "Hide Guides" : "Show Guides"}
        </button>
      </div>

      {showGuides && (
        <>
          {/* Bleed Area (Outer Edge is Bleed Limit) */}
          <div
            className="absolute border border-red-400 opacity-50"
            style={{
              top: `${bleedArea.top}%`,
              bottom: `${bleedArea.bottom}%`,
              left: `${bleedArea.left}%`,
              right: `${bleedArea.right}%`,
            }}
          >
            <div className="absolute -top-3 left-2 bg-red-500 text-white text-[10px] px-1 rounded">
              Bleed Area
            </div>
          </div>

          {/* Trim Line (Simulated 3mm inside) */}
          <div
            className="absolute border border-blue-400 opacity-50"
            style={{
              top: "5%",
              bottom: "5%",
              left: "5%",
              right: "5%",
            }}
          >
            {/* Safe Area (Green Dotted, ~3mm inside trim) */}
            <div
              className="absolute border-2 border-dashed border-green-500 opacity-70"
              style={{
                top: `${safeArea.top}%`,
                bottom: `${safeArea.bottom}%`,
                left: `${safeArea.left}%`,
                right: `${safeArea.right}%`,
              }}
            >
              <div className="absolute -top-3 left-2 text-green-600 bg-white/80 text-[10px] px-1 rounded font-bold">
                Safe Area
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface UploadedFile {
  file: File;
  preview: string;
  isValid: boolean;
  errors: string[];
}

interface DesignSpecs {
  height: number;
  width: number;
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  bleedTop: number;
  bleedBottom: number;
  bleedLeft: number;
  bleedRight: number;
  description: string;
}

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"select" | "upload">("select");

  // Default user ID for uploads (fallback)
  const defaultUserId = "691d91e4c0d02a26876efbc7";
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Upload State
  const [frontFile, setFrontFile] = useState<UploadedFile | null>(null);
  const [backFile, setBackFile] = useState<UploadedFile | null>(null);
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Design Specifications
  const [designSpecs, setDesignSpecs] = useState<DesignSpecs>({
    height: 2.0, // inches
    width: 3.5, // inches
    safeTop: 10,
    safeBottom: 10,
    safeLeft: 10,
    safeRight: 10,
    bleedTop: 15,
    bleedBottom: 15,
    bleedLeft: 15,
    bleedRight: 15,
    description: "",
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Get user ID and name directly from localStorage user field
  useEffect(() => {
    const getUserFromLocalStorage = () => {
      try {
        const userData = localStorage.getItem("user");

        console.log("🔐 Checking localStorage for user data:", {
          hasUserData: !!userData,
        });

        if (userData) {
          const user = JSON.parse(userData);
          console.log("✅ Found user data in localStorage:", user);

          // Handle different possible user object structures
          let userId: string | null = null;
          let userName: string | null = null;

          // Case 1: Direct user object with _id
          if (user && user._id && typeof user._id === "string") {
            userId = user._id;
            userName = user.name || user.email || user.username || "User";
          }
          // Case 2: Nested user object (user.user._id)
          else if (
            user &&
            user.user &&
            user.user._id &&
            typeof user.user._id === "string"
          ) {
            userId = user.user._id;
            userName =
              user.user.name || user.user.email || user.user.username || "User";
          }
          // Case 3: Check for id instead of _id
          else if (user && user.id && typeof user.id === "string") {
            userId = user.id;
            userName = user.name || user.email || user.username || "User";
          }
          // Case 4: Nested with id instead of _id
          else if (
            user &&
            user.user &&
            user.user.id &&
            typeof user.user.id === "string"
          ) {
            userId = user.user.id;
            userName =
              user.user.name || user.user.email || user.user.username || "User";
          }

          if (userId) {
            setCurrentUserId(userId);
            setUserName(userName || "Your Account");
            setIsLoggedIn(true);
            console.log("✅ User is logged in with ID:", userId);
            return;
          }
        }

        // If we get here, no valid user was found
        console.warn("⚠️ No valid user ID found - user not logged in");
        setCurrentUserId(null);
        setIsLoggedIn(false);
        setUserName("");
      } catch (error) {
        console.error("❌ Error reading localStorage:", error);
        setCurrentUserId(null);
        setIsLoggedIn(false);
        setUserName("");
      }
    };

    getUserFromLocalStorage();
  }, []);

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  // File validation
  const validateFile = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve) => {
      const errors: string[] = [];
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];

      if (!validTypes.includes(file.type)) {
        errors.push("Invalid file format. Use JPG, PNG, or PDF.");
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push("File size exceeds 10MB limit.");
      }

      // Image dimension check
      if (file.type.startsWith("image/")) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const dpi = img.width / designSpecs.width; // Calculate approximate DPI
          if (dpi < 300) {
            errors.push(
              `Low resolution (${Math.round(
                dpi
              )} DPI). Minimum 300 DPI recommended.`
            );
          }
          if (img.width < 1000 || img.height < 600) {
            errors.push("Low resolution image. Minimum 1000x600px required.");
          }
          resolve({
            file,
            preview: url,
            isValid: errors.length === 0,
            errors,
          });
        };
        img.onerror = () => {
          errors.push("Failed to load image data.");
          resolve({ file, preview: "", isValid: false, errors });
        };
        img.src = url;
      } else {
        resolve({
          file,
          preview: "",
          isValid: errors.length === 0,
          errors,
        });
      }
    });
  };

  const handleDrop = async (e: React.DragEvent, side: "front" | "back") => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      const validated = await validateFile(e.dataTransfer.files[0]);
      if (side === "front") setFrontFile(validated);
      else setBackFile(validated);
      setActiveSide(side);
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) => {
    if (e.target.files?.[0]) {
      const validated = await validateFile(e.target.files[0]);
      if (side === "front") setFrontFile(validated);
      else setBackFile(validated);
      setActiveSide(side);
    }
  };

  // Upload to API - Using user ID from localStorage
  const handleUpload = async () => {
    console.log("🔼 Upload button clicked");

    // Check if user is logged in
    if (!isLoggedIn || !currentUserId) {
      handleLoginRedirect();
      return;
    }

    if (!frontFile || !frontFile.isValid) {
      return;
    }


    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Required fields - use user ID from localStorage
      formData.append("userId", currentUserId);
      formData.append("height", designSpecs.height.toString());
      formData.append("width", designSpecs.width.toString());
      formData.append("description", designSpecs.description);

      // Safe area
      formData.append("safeTop", designSpecs.safeTop.toString());
      formData.append("safeBottom", designSpecs.safeBottom.toString());
      formData.append("safeLeft", designSpecs.safeLeft.toString());
      formData.append("safeRight", designSpecs.safeRight.toString());

      // Bleed area
      formData.append("bleedTop", designSpecs.bleedTop.toString());
      formData.append("bleedBottom", designSpecs.bleedBottom.toString());
      formData.append("bleedLeft", designSpecs.bleedLeft.toString());
      formData.append("bleedRight", designSpecs.bleedRight.toString());

      // Files
      formData.append("frontImage", frontFile.file);
      if (backFile && backFile.isValid) {
        formData.append("backImage", backFile.file);
      }

      // Get token for authorization header if available
      const token = localStorage.getItem("token");

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 201) {
          const result = JSON.parse(xhr.responseText);
          setUploadResult(result);
          setIsUploading(false);
          console.log("✅ Upload successful!");
        } else {
          console.error(
            "❌ Upload failed with status:",
            xhr.status,
            xhr.responseText
          );
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        console.error("❌ Upload XHR error");
        setIsUploading(false);
      };

      xhr.open("POST", `${API_BASE_URL_WITH_API}/upload`);

      // Add headers
      xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      console.log("📤 Sending upload request with userId:", currentUserId);
      xhr.send(formData);
    } catch (error) {
      console.error("❌ Upload error:", error);
      setIsUploading(false);
    }
  };

  const renderSelectionMode = () => (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold text-cream-900 mb-4">
          Upload Your Design
        </h1>
        <p className="text-cream-600 text-lg">
          Get professional printing with our automated file preparation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 px-4">
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-cream-200 shadow-lg cursor-pointer hover:shadow-xl transition-all group md:col-span-2 max-w-2xl mx-auto"
          onClick={() => {
            if (!isLoggedIn) {
              handleLoginRedirect();
              return;
            }
            setMode("upload");
          }}
        >
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mb-6 text-cream-900 group-hover:bg-cream-900 group-hover:text-white transition-colors mx-auto">
            <UploadIcon size={32} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-cream-900 mb-3 text-center">
            Upload Print-Ready Files
          </h2>
          <p className="text-cream-600 mb-6 text-center">
            Upload your designs with automatic CMYK conversion, bleed area
            setup, and professional pre-press checks.
          </p>
          <div className="text-center">
            <button className="text-cream-900 font-bold flex items-center group-hover:gap-2 transition-all mx-auto">
              {isLoggedIn ? "Start Upload" : "Login to Upload"}{" "}
              <UploadIcon size={16} className="ml-2" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12 px-4 sm:px-6">
        <div className="text-center p-6 bg-white rounded-xl border border-cream-100">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-green-600">
            <CheckCircle size={24} />
          </div>
          <h3 className="font-bold text-cream-900 mb-2">
            Auto CMYK Conversion
          </h3>
          <p className="text-cream-600 text-sm">
            Automatic conversion to print-ready CMYK color space
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl border border-cream-100">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Ruler size={24} />
          </div>
          <h3 className="font-bold text-cream-900 mb-2">Bleed Area Setup</h3>
          <p className="text-cream-600 text-sm">
            Professional bleed and safe area configuration
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-xl border border-cream-100">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600">
            <Shield size={24} />
          </div>
          <h3 className="font-bold text-cream-900 mb-2">Quality Check</h3>
          <p className="text-cream-600 text-sm">
            Automatic resolution and format validation
          </p>
        </div>
      </div>
    </div>
  );

  const renderLoginRequired = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-white rounded-3xl p-12 border border-cream-100 shadow-lg">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogIn size={40} className="text-yellow-600" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-cream-900 mb-4">
          Login Required
        </h2>
        <p className="text-cream-600 text-lg mb-6">
          Please log in to upload your designs and access all features.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleLoginRedirect}
            className="w-full bg-cream-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-cream-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            Go to Login
          </button>
          <button
            onClick={() => setMode("select")}
            className="w-full bg-cream-100 text-cream-700 py-3 rounded-xl font-bold hover:bg-cream-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Options
          </button>
        </div>
      </div>
    </div>
  );

  const renderUploadTool = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <button
        onClick={() => {
          setMode("select");
          setUploadResult(null);
        }}
        className="flex items-center text-cream-600 hover:text-cream-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" /> Back to Options
      </button>

      {uploadResult ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 text-center border border-cream-100 shadow-lg"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-cream-900 mb-4">
            Upload Successful!
          </h2>
          <p className="text-cream-600 mb-6">
            Your design has been processed and is ready for printing.
            {uploadResult.design.hasBackImage
              ? " Both front and back images were uploaded."
              : " Only front image was uploaded."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 text-left">
            <div className="bg-cream-50 p-4 rounded-xl">
              <h4 className="font-bold text-cream-900 mb-2">Design Details</h4>
              <p className="text-sm text-cream-600">
                Size: {uploadResult.design.width}" ×{" "}
                {uploadResult.design.height}"
              </p>
              <p className="text-sm text-cream-600">
                Files: {uploadResult.design.hasBackImage ? "2" : "1"}
              </p>
            </div>
            <div className="bg-cream-50 p-4 rounded-xl">
              <h4 className="font-bold text-cream-900 mb-2">Processing</h4>
              <p className="text-sm text-cream-600">✓ CMYK Conversion</p>
              <p className="text-sm text-cream-600">✓ Bleed Setup</p>
            </div>
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="bg-cream-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-cream-800 transition-colors"
          >
            Upload Another Design
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Upload Zones & Settings */}
          <div className="lg:w-2/5 space-y-6">
            {/* User Info */}

            {/* Design Specifications */}
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-cream-100 shadow-sm">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-cream-900 mb-3 sm:mb-4 flex items-center gap-2">
                <Ruler size={18} className="sm:w-5 sm:h-5" />
                Design Specifications
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <label className="block text-sm font-medium text-cream-700 mb-1">
                    Width (inches)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={designSpecs.width}
                    onChange={(e) =>
                      setDesignSpecs((prev) => ({
                        ...prev,
                        width: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full p-3 rounded-xl border border-cream-300 focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cream-700 mb-1">
                    Height (inches)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={designSpecs.height}
                    onChange={(e) =>
                      setDesignSpecs((prev) => ({
                        ...prev,
                        height: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full p-3 rounded-xl border border-cream-300 focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-cream-700 mb-1">
                  Description
                </label>
                <textarea
                  value={designSpecs.description}
                  onChange={(e) =>
                    setDesignSpecs((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Add notes about your design..."
                  className="w-full p-3 rounded-xl border border-cream-300 focus:ring-2 focus:ring-cream-900 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 text-cream-700 hover:text-cream-900 transition-colors text-sm font-medium"
              >
                <Settings size={16} />
                {showAdvancedSettings ? "Hide" : "Show"} Advanced Settings
              </button>
            </div>

            {/* Advanced Settings */}
            {showAdvancedSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-white p-6 rounded-2xl border border-cream-100 shadow-sm"
              >
                <h4 className="font-bold text-cream-900 mb-4">
                  Print Safety Margins (%)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    "safeTop",
                    "safeBottom",
                    "safeLeft",
                    "safeRight",
                    "bleedTop",
                    "bleedBottom",
                    "bleedLeft",
                    "bleedRight",
                  ].map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-cream-600 mb-1 capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={designSpecs[key as keyof DesignSpecs]}
                        onChange={(e) =>
                          setDesignSpecs((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full p-2 rounded-lg border border-cream-300 focus:ring-1 focus:ring-cream-900 focus:border-transparent outline-none"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* File Upload Zones */}
            {["front", "back"].map((side) => {
              const isFront = side === "front";
              const fileData = isFront ? frontFile : backFile;

              return (
                <div key={side}>
                  <label className="block text-sm font-bold text-cream-900 uppercase mb-2 tracking-wider">
                    {side} Side {isFront ? "*" : "(Optional)"}
                  </label>

                  {!fileData ? (
                    <div
                      className="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center bg-white hover:bg-cream-50 hover:border-cream-400 transition-all cursor-pointer relative"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => handleDrop(e, side as "front" | "back")}
                    >
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) =>
                          handleFileSelect(e, side as "front" | "back")
                        }
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                      />
                      <UploadIcon className="mx-auto text-cream-400 mb-2" />
                      <p className="text-sm font-medium text-cream-700">
                        Drag & Drop or Click
                      </p>
                      <p className="text-xs text-cream-500 mt-1">
                        JPG, PNG, PDF (Max 10MB)
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`border rounded-xl p-4 flex items-start gap-4 relative ${
                        fileData.isValid
                          ? "bg-white border-cream-200"
                          : "bg-red-50 border-red-200"
                      }`}
                      onClick={() => setActiveSide(side as "front" | "back")}
                    >
                      {fileData.preview ? (
                        <img
                          src={fileData.preview}
                          className="w-16 h-16 object-cover rounded bg-cream-100"
                          alt="preview"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-cream-100 rounded flex items-center justify-center">
                          <FileIcon className="text-cream-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-cream-900 truncate">
                          {fileData.file.name}
                        </p>
                        <p className="text-xs text-cream-500 mb-2">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {fileData.isValid ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> Ready for Upload
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {fileData.errors.map((err, i) => (
                              <p
                                key={i}
                                className="text-xs text-red-500 flex items-center gap-1"
                              >
                                <AlertCircle size={12} /> {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          isFront ? setFrontFile(null) : setBackFile(null);
                        }}
                        className="text-cream-400 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>

                      {activeSide === side && (
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-cream-900 border-b-8 border-b-transparent hidden lg:block"></div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Upload Requirements */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Info size={16} /> Professional Print Requirements
              </h4>
              <ul className="text-xs space-y-2 opacity-80">
                <li>• Format: JPG, PNG, PDF</li>
                <li>• Resolution: 300 DPI minimum</li>
                <li>• Color: Auto-converted to CMYK</li>
                <li>• Bleed: 3mm recommended on all sides</li>
                <li>• File Size: Maximum 10MB per file</li>
              </ul>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={
                !isLoggedIn || !frontFile || !frontFile.isValid || isUploading
              }
              className="w-full bg-cream-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-cream-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              {!isLoggedIn ? (
                <>
                  <LogIn size={20} />
                  Login to Upload
                </>
              ) : isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <UploadIcon size={20} />
                  Process & Upload Design
                </>
              )}
            </button>
          </div>

          {/* Preview Stage */}
          <div className="lg:w-3/5 bg-cream-100 rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[600px]">
            {/* Background Grid */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(#976b4d 1px, transparent 1px), linear-gradient(90deg, #976b4d 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            ></div>

            {/* The active visual */}
            <div className="relative z-10 shadow-2xl">
              {(activeSide === "front" && frontFile) ||
              (activeSide === "back" && backFile) ? (
                <div className="relative w-[500px] aspect-[1.75/1] bg-white">
                  {(activeSide === "front" ? frontFile : backFile)?.preview && (
                    <img
                      src={
                        (activeSide === "front" ? frontFile : backFile)?.preview
                      }
                      className="w-full h-full object-cover"
                      alt="preview"
                    />
                  )}
                  <GuidesOverlay
                    safeArea={{
                      top: designSpecs.safeTop,
                      bottom: designSpecs.safeBottom,
                      left: designSpecs.safeLeft,
                      right: designSpecs.safeRight,
                    }}
                    bleedArea={{
                      top: designSpecs.bleedTop,
                      bottom: designSpecs.bleedBottom,
                      left: designSpecs.bleedLeft,
                      right: designSpecs.bleedRight,
                    }}
                  />
                </div>
              ) : (
                <div className="w-[500px] aspect-[1.75/1] bg-white flex flex-col items-center justify-center text-cream-300 border-2 border-dashed border-cream-200">
                  <ImageIcon size={48} className="mb-4" />
                  <p className="text-cream-400 font-medium">
                    Preview will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-8 flex gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2 text-xs text-cream-700">
                <span className="w-3 h-3 border border-red-400 bg-red-50"></span>
                <span>Bleed Area (Cut Zone)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-cream-700">
                <span className="w-3 h-3 border border-blue-400 bg-blue-50"></span>
                <span>Trim Line (Final Size)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-cream-700">
                <span className="w-3 h-3 border-2 border-dashed border-green-500 bg-green-50"></span>
                <span>Safe Area (Text/Logos)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 mb-6">
        <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
      </div>
      <AnimatePresence mode="wait">
        {mode === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderSelectionMode()}
          </motion.div>
        )}

        {mode === "upload" && !isLoggedIn && (
          <motion.div
            key="login-required"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {renderLoginRequired()}
          </motion.div>
        )}

        {mode === "upload" && isLoggedIn && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderUploadTool()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Upload;
