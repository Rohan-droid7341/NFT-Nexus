"use client";

import { useState } from "react";
import { ethers } from "ethers"; // Removed parseUnits as it wasn't used in original logic
import axios from "axios";
import NFTMarketplace from "../../contract_data/NFTMarketplace.json";

import "./createNFT.css"; // Import the new CSS

// --- Configuration (Keep your original keys) ---
const contractAddress = "0x13b8718898f70eF57424295b1b6A1eae3F5a0238";
const PINATA_KEY = "1ce3f0a779030d3754f6"; // Use your key
const SECRET_API = "a6ed01bc211f51ba7d6b31b9019fd5fd23f7f7c3ff740190b26b82d66258ce27"; // Use your secret
// IMPORTANT: For production, move these to environment variables!

const pinataBaseURL = "https://api.pinata.cloud/pinning";
const gatewayBaseURL = "https://gateway.pinata.cloud/ipfs"; // Or your preferred gateway

export default function CreateNFT() {
  // --- State Variables (Exactly as in your original code) ---
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    price: "", // Original logic includes price input
    category: "Artwork",
  });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false); // Single loading state as per original logic

  // --- Functions (Exactly as in your original code, with minor fixes/logging) ---
  async function connectWallet() {
    if (window.ethereum) {
      try {
        console.log("🔌 Connecting wallet...");
        const provider = new ethers.BrowserProvider(window.ethereum);
        // Request account access
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        console.log("✅ Wallet Connected:", address);
      } catch (error) {
        console.error("❌ Error connecting to MetaMask:", error);
        alert(`Connection failed: ${error?.message || "Unknown error"}`);
      }
    } else {
      alert("🦊 MetaMask not installed. Please install it to continue.");
    }
  }

  async function onChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true); // Use the single loading state
    setFileUrl(null); // Reset preview while uploading
    console.log("☁️ Uploading file to Pinata...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${pinataBaseURL}/pinFileToIPFS`, // Use variable for base URL
        formData,
        {
          // Let axios set Content-Type with boundary
          maxBodyLength: Infinity, // Good practice for file uploads
          headers: {
            pinata_api_key: PINATA_KEY,
            pinata_secret_api_key: SECRET_API,
          },
        }
      );

      const ipfsHash = res.data.IpfsHash;
      // *** Corrected template literal syntax ***
      const url = `${gatewayBaseURL}/${ipfsHash}`;
      setFileUrl(url);
      console.log("✅ File Uploaded to IPFS:", url);
    } catch (error) {
      console.error("❌ Error uploading file to IPFS:", error);
      alert(`File upload failed: ${error?.response?.data?.error || error.message}`);
      setFileUrl(null); // Clear URL on error
    } finally {
        setLoading(false); // Turn off loading regardless of success/failure
    }
  }

  async function createNFT() {
    if (!account) {
      alert("⚠️ Please connect your MetaMask wallet first.");
      return;
    }

    const { name, description, price, category } = formInput;
    // Original logic checks price here
    if (!name || !description || !price || !fileUrl || !category) {
      alert("⚠️ Please fill in all NFT details (including price) and upload an image.");
      return;
    }
     // Optional: Basic price validation if needed by your logic downstream
     if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
       alert("⚠️ Please enter a valid positive price.");
       return;
     }

    setLoading(true); // Use the single loading state
    console.log(" N Creating NFT metadata...");

    try {
      // --- Metadata structure as per original logic ---
      const metadata = {
        name,
        description,
        image: fileUrl,
        // Add attributes if your contract/standard expects them
        attributes: [
             { trait_type: "Category", value: category },
             { trait_type: "Price", value: price } // Include price if desired in metadata
        ]
      };

      const metadataRes = await axios.post(
        `${pinataBaseURL}/pinJSONToIPFS`, // Use variable
        metadata,
        {
          headers: {
            pinata_api_key: PINATA_KEY,
            pinata_secret_api_key: SECRET_API,
          },
        }
      );

      const metadataHash = metadataRes.data.IpfsHash;
      // *** Corrected template literal syntax ***
      const metadataUrl = `${gatewayBaseURL}/${metadataHash}`;
      console.log("✅ Metadata Uploaded:", metadataUrl);

      // --- Call mintNFT function (logic unchanged) ---
      await mintNFT(metadataUrl, category);

       // Reset form only on full success (after minting)
       setFileUrl(null);
       setFormInput({ name: "", description: "", price: "", category: "Artwork" });

    } catch (error) {
      console.error("❌ Error creating NFT metadata or calling mint:", error);
      alert(`NFT Creation failed: ${error?.response?.data?.error || error.message}`);
       // Don't reset form on error here, let user correct
    } finally {
        setLoading(false); // Turn off loading
    }
  }

  async function mintNFT(tokenURI, category) {
     // setLoading(true); // Already set in createNFT
     console.log(` M Attempting to mint NFT with URI: ${tokenURI}`);
    try {
      if (!window.ethereum) throw new Error("MetaMask is not available.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, NFTMarketplace.abi, signer);

      console.log("💰 Fetching minting fee...");
      const mintingFee = await contract.mintingPrice();
      console.log(`   Minting Fee required: ${ethers.formatEther(mintingFee)} ETH`);

      // --- Category mapping as per original logic ---
      const categoryMap = {
        Artwork: 0,
        Video: 1,
        GIF: 2,
      };
      const categoryValue = categoryMap[category];
      if (categoryValue === undefined) {
        throw new Error(`Invalid category selected: ${category}`);
      }

      console.log(`   Sending transaction with category ID: ${categoryValue} and value: ${ethers.formatEther(mintingFee)} ETH`);
      const tx = await contract.mintToken(tokenURI, categoryValue, {
        value: mintingFee,
      });

      console.log("⏳ Waiting for transaction confirmation...", tx.hash);
      await tx.wait(); // Wait for the transaction to be mined

      // --- Alert as per original logic ---
      alert("🎉 NFT successfully minted! Transaction hash: " + tx.hash);
      console.log("✅ NFT Minted! Transaction:", tx);

    } catch (error) {
      console.error("❌ Minting error:", error);
      // --- Alert as per original logic ---
      let message = error.reason || error.message || "An unknown error occurred during minting.";
      if (error.data?.message) message = error.data.message; // More specific RPC error
      if (message.includes("insufficient funds")) message = "Insufficient funds for transaction.";
      if (message.includes("user rejected transaction")) message = "Transaction rejected by user.";

      alert("❌ Minting failed: " + message);
       // Do not reset form here, let createNFT handle success/failure
    }
     // setLoading(false); // Handled in createNFT's finally block
  }

   // Helper function to shorten address (useful for display)
   const shortenAddress = (address) => {
     if (!address) return "";
     return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
   };


  // --- JSX Structure with new classes for styling ---
  return (
    <>
        {/* Font import link - place in <head> or layout file ideally */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto:wght@300;400;700&display=swap" rel="stylesheet"/>

        {/* Outermost container */}
        <div className="create-container">
            {/* Styled content wrapper */}
            <div className="content-wrapper">
                {/* Title (original element, new class) */}
                <h2 className="create-title">Create Your NFT</h2>

                {/* Connect Button (original element, new class) */}
                <button className="connect-btn" onClick={connectWallet} disabled={!!account}>
                    {/* Original button text logic */}
                    {account ? `✅ Connected: ${shortenAddress(account)}` : "🔌 Connect Wallet"}
                </button>

                {/* Wrapper for side-by-side layout */}
                <div className={`form-preview-wrapper ${fileUrl ? 'has-preview' : ''}`}>

                    {/* Form Section Wrapper */}
                    <div className="form-section">
                        {/* Form Group (original element, new class) */}
                        {/* Note: Original had inputs directly in form-group */}
                        <div className="form-group">
                             {/* Inputs using new 'input-field' class */}
                            <input
                                className="input-field"
                                placeholder="NFT Name"
                                value={formInput.name} // Controlled input
                                onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
                                disabled={loading}
                            />
                            <textarea
                                className="input-field textarea-field"
                                placeholder="NFT Description"
                                value={formInput.description} // Controlled input
                                onChange={(e) => setFormInput({ ...formInput, description: e.target.value })}
                                disabled={loading}
                            />
                            <input
                                className="input-field"
                                type="number"
                                placeholder="Price in ETH" // Original logic used price
                                value={formInput.price} // Controlled input
                                min="0"
                                step="0.001"
                                onChange={(e) => setFormInput({ ...formInput, price: e.target.value })}
                                disabled={loading}
                            />
                            <select
                                className="input-field select-field"
                                value={formInput.category} // Controlled input
                                onChange={(e) => setFormInput({ ...formInput, category: e.target.value })}
                                disabled={loading}
                            >
                                {/* Original options */}
                                <option value="Artwork">🖼️ Artwork</option>
                                <option value="Video">🎬 Video</option>
                                <option value="GIF">✨ GIF</option>
                            </select>

                            {/* Styled File Input using Label */}
                            <label htmlFor="file-upload" className={`file-input-label ${loading ? 'disabled' : ''}`}>
                                {loading && fileUrl === null && <div className="loading-spinner small-spinner"></div>} {/* Show spinner only during upload */}
                                {loading && fileUrl === null ? "Uploading..." : (fileUrl ? "✅ Image Selected" : "📁 Choose Image")}
                            </label>
                            <input
                                id="file-upload"
                                className="file-input" // Keep class for potential targeting, but hide
                                type="file"
                                onChange={onChange}
                                accept="image/*, video/mp4, video/webm"
                                hidden // Visually hide the default input
                                disabled={loading}
                            />
                        </div> {/* End form-group */}


                        {/* Create Button (original element, new class) */}
                        <button
                            className="btn create-btn" // Apply new button style
                            onClick={createNFT}
                            disabled={loading || !fileUrl || !account} // Disable if loading, no file, or not connected
                        >
                            {loading && <div className="loading-spinner"></div>} {/* Show spinner during entire process */}
                            {loading ? "Processing..." : "🚀 Create NFT"}
                        </button>

                        {/* AI Button (original element, new class) */}
                        <button className="btn btn-secondary ai-btn" disabled={loading}>
                           Or Generate with AI ✨ (Soon)
                        </button>

                     </div> {/* End form-section */}


                     {/* Preview Section Wrapper (conditionally shown via CSS) */}
                    <div className="preview-section">
                         <h3 className="preview-title">Preview</h3>
                         {/* Original loading indicator logic */}
                         {loading && fileUrl === null && ( // Show placeholder/spinner only during upload phase
                             <div className="media-placeholder media-loading">
                                <div className="loading-spinner"></div>
                                <span>Uploading to IPFS...</span>
                            </div>
                         )}
                         {/* Show placeholder if not loading and no file */}
                         {!loading && !fileUrl && (
                             <div className="media-placeholder">
                                <span>Upload an image to see preview</span>
                            </div>
                         )}
                         {/* Original image preview logic */}
                         {fileUrl && ( // Show image once URL is available (even if minting is loading)
                            <img src={fileUrl} alt="NFT preview" className="nft-preview" />
                         )}
                    </div> {/* End preview-section */}

                </div> {/* End form-preview-wrapper */}
            </div> {/* End content-wrapper */}
        </div> {/* End create-container */}
    </>
  );
}