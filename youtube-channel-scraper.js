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

    // Extracting the highest resolution thumbnail URL
    const thumbnails = video.thumbnails;
    const thumbnailUrl = 
      (thumbnails.maxres && thumbnails.maxres.url) ||
      (thumbnails.standard && thumbnails.standard.url) ||
      (thumbnails.high && thumbnails.high.url) ||
      (thumbnails.medium && thumbnails.medium.url) ||
      thumbnails.default.url;
  
    const description = video.description || '';

  return {
    title: video.title,
    embedLink: `https://www.youtube.com/embed/${videoId}`,
    thumbnailUrl: thumbnailUrl,
    publishedAt: video.publishedAt,
    description: video.description
  };
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
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
