require('dotenv').config();
const { google } = require('googleapis');

const apiKey = process.env.YOUTUBE_API_KEY;
const channelId = process.env.YOUTUBE_CHANNEL_ID;

async function getVideoDetails(youtube, videoId) {
  try {
    const response = await youtube.videos.list({
      part: 'snippet',
      id: videoId
    });

    if (response.data.items.length === 0) {
      return 'No video found for the given ID.';
    }

    const video = response.data.items[0].snippet;
    const description = video.description || '';
    const descriptionParts = splitDescription(description);

    return {
      title: video.title,
      embedLink: `https://www.youtube.com/embed/${videoId}`,
      publishedAt: video.publishedAt,
      description: {
        firstParagraph: descriptionParts.firstParagraph,
        originalPublishTimestamp: descriptionParts.originalPublishTimestamp,
        remainingText: descriptionParts.remainingText
      }
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}

function splitDescription(description) {
  const parts = description.split('\n').map(line => line.trim());
  let firstParagraph = '';
  let originalPublishTimestamp = '';
  let remainingText = '';

  let firstParagraphEndFound = false;

  parts.forEach((line, index) => {
    if (!firstParagraphEndFound) {
      firstParagraph += line + '\n';
      if (line === '' || index === parts.length - 1) {
        firstParagraphEndFound = true;
      }
    } else if (line.startsWith('Originally Published')) {
      originalPublishTimestamp = line;
    } else {
      remainingText += line + '\n';
    }
  });

  return { firstParagraph, originalPublishTimestamp, remainingText };
}

async function listAllVideos() {
  if (!apiKey || !channelId) {
    console.error('Error: API key and Channel ID must be set as environment variables.');
    process.exit(1);
  }

  const youtube = google.youtube({
    version: 'v3',
    auth: apiKey
  });

  let allVideos = [];
  let nextPageToken = '';

  do {
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      maxResults: 50,
      pageToken: nextPageToken,
      type: 'video'
    });

    const videoIds = response.data.items.map(item => item.id.videoId);
    nextPageToken = response.data.nextPageToken;

    for (let videoId of videoIds) {
      const videoDetails = await getVideoDetails(youtube, videoId);
      allVideos.push(videoDetails);
    }
  } while (nextPageToken);

  return allVideos;
}

if (require.main === module) {
  listAllVideos()
    .then(videos => console.log(videos))
    .catch(error => console.error(error));
} else {
  module.exports = listAllVideos;
}
