"use client";

import { useState } from "react";
import { ethers, parseUnits } from "ethers";
import axios from "axios";
import NFTMarketplace from "../../contract_data/NFTMarketplace.json";
import "./CreateNFT.css"; // Import CSS

const contractAddress = "0x13b8718898f70eF57424295b1b6A1eae3f5a0238";
const PINATA_KEY = "1ce3f0a779030d3754f6";
const SECRET_API = "a6ed01bc211f51ba7d6b31b9019fd5fd23f7f7c3ff740190b26b82d66258ce27";

export default function CreateNFT() {
  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    price: "",
    category: "Artwork",
  });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  async function connectWallet() {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
      } catch (error) {
        console.error("❌ Error connecting to MetaMask:", error);
      }
    } else {
      alert("🦊 MetaMask not installed.");
    }
  }

  async function onChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            pinata_api_key: PINATA_KEY,
            pinata_secret_api_key: SECRET_API,
          },
        }
      );
      const ipfsHash = res.data.IpfsHash;
      const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      setFileUrl(url);
    } catch (error) {
      console.error("❌ Error uploading file to IPFS:", error);
    }
    setLoading(false);
  }

  async function createNFT() {
    if (!account) {
      alert("Please connect to MetaMask first.");
      return;
    }
    const { name, description, price, category } = formInput;
    if (!name || !description || !price || !fileUrl) {
      alert("Fill all fields first!");
      return;
    }
    try {
      const metadata = {
        name,
        description,
        image: fileUrl,
      };

      const metadataRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        metadata,
        {
          headers: {
            pinata_api_key: PINATA_KEY,
            pinata_secret_api_key: SECRET_API,
          },
        }
      );

      const metadataHash = metadataRes.data.IpfsHash;
      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
      await mintNFT(metadataUrl, category);
    } catch (error) {
      console.error("❌ Error creating NFT:", error);
    }
  }

  async function mintNFT(tokenURI, category) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        NFTMarketplace.abi,
        signer
      );

      const mintingFee = await contract.mintingPrice();

      const categoryMap = {
        Artwork: 0,
        Video: 1,
        GIF: 2,
      };

      const categoryValue = categoryMap[category];

      const tx = await contract.mintToken(tokenURI, categoryValue, {
        value: mintingFee,
      });

      await tx.wait();
      alert("NFT successfully minted!");
    } catch (error) {
      console.error("❌ Minting error:", error);
      alert("Minting failed: " + error.message);
    }
  }

  function RainEffect() {
    const [beams, setBeams] = useState([]);

    useEffect(() => {
        const createBeams = () => {
            const newBeams = Array.from({ length: 30 }).map((_, i) => ({ // Create 30 beams
                id: i,
                left: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 2}s`, // Duration between 2s and 5s
                animationDelay: `${Math.random() * 5}s`, // Delay up to 5s
            }));
            setBeams(newBeams);
        };
        createBeams();

        // Optional: recreate beams periodically if needed, but usually not necessary for infinite animation
        // const intervalId = setInterval(createBeams, 10000); // Recreate every 10s
        // return () => clearInterval(intervalId); // Cleanup interval

    }, []); // Run only once on mount
  }


  return (
    // Add relative positioning for the background animation later
    <div className="create-container relative isolate overflow-hidden">
      {/* Rain Background - Added Later */}
      {/* <div className="rain-background absolute inset-0 -z-10 pointer-events-none"></div> */}

      <div className="content-wrapper z-10 relative"> {/* Added wrapper for content */}
        <h2 className="create-title">Create Your NFT</h2>

        <button className="connect-btn" onClick={connectWallet}>
          {account
            ? `Connected: ${account.substring(0, 6)}...`
            : "Connect MetaMask"}
        </button>

        {/* NEW: Wrapper for Form and Preview */}
        <div className={`form-preview-wrapper ${fileUrl ? "has-preview" : ""}`}>
          {/* Form Section */}
          <div className="form-section">
            {/* Existing form content */}
            <div className="form-group">
              <input
                className="form-input"
                placeholder="NFT Name"
                onChange={(e) =>
                  setFormInput({ ...formInput, name: e.target.value })
                }
              />
              <textarea
                className="form-textarea"
                placeholder="NFT Description"
                onChange={(e) =>
                  setFormInput({ ...formInput, description: e.target.value })
                }
              />
              {/* <input
                className="form-input"
                type="number"
                placeholder="Price in ETH (e.g., 0.01)" // Added placeholder example
                step="0.001" // Allow decimals
                min="0" // Prevent negative prices
                onChange={(e) =>
                  setFormInput({ ...formInput, price: e.target.value })
                }
              /> */}
              <select
                className="form-select"
                value={formInput.category} // Control the select value
                onChange={(e) =>
                  setFormInput({ ...formInput, category: e.target.value })
                }
              >
                <option value="Artwork">Artwork</option>
                <option value="Video">Video</option>
                <option value="GIF">GIF</option>
              </select>
              <label className="file-input-label">
                {fileUrl ? "Change Image" : "Upload Image"}
                <input
                  className="form-input file-input" // Keep this class if styled specifically
                  type="file"
                  onChange={onChange}
                  hidden // Hide the default ugly input
                />
              </label>
            </div>
            {loading && <p className="loading">Uploading to IPFS...</p>}
            {!fileUrl && !loading && <p className="upload-prompt">Upload an image to see a preview.</p>}
            <button className="create-btn" onClick={createNFT} disabled={loading || !fileUrl}>
              {loading ? "Processing..." : "Create NFT"}
            </button>
            {/* Consider routing for AI button */}
            <button className="ai-btn" onClick={() => alert('Navigate to AI creation page...')}>
              or Create with AI
            </button>
          </div> {/* End Form Section */}

          {/* Preview Section - Conditional Rendering */}
          {fileUrl && (
            <div className="preview-section">
              <img src={fileUrl} alt="NFT preview" className="nft-preview" />
            </div>
          )} {/* End Preview Section */}

        </div> {/* End Form Preview Wrapper */}
      </div> {/* End Content Wrapper */}
       {/* Rain Background Component - Added Later */}
       {/* <RainEffect /> */}
    </div> // End Create Container
  );

}
