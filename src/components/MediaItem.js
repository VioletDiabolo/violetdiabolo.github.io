import React, { useState } from "react";

function MediaItem({ name, link }) {
    const [showVideo, setShowVideo] = useState(false);
    const handleClick = () => {
      setShowVideo(!showVideo);
    };
  return (
    <div className="mediaItem">
      <h2>{name}</h2>
      <div className="mediaImage">
        <div className="videoEmbed">
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${link}`}
            frameBorder="0"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default MediaItem;