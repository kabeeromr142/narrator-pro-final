import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type, Modality } from "@google/genai";

declare var Sentry: any;

// FIX: Removed the conflicting 'declare global' block for window.aistudio.
// The type definitions for window.aistudio are assumed to be provided by the
// host environment, and redeclaring them was causing a type conflict.

const getAiClient = async (onProgress: (message: string) => void): Promise<GoogleGenAI> => {
    onProgress("Checking for API key...");
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        onProgress("Please select an API key to continue.");
        await window.aistudio.openSelectKey();
        onProgress("API key selected. Initializing generator...");
    } else {
        onProgress("API key found. Initializing generator...");
    }

    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set. Please select a key.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const loadingMessages = [
    "Warming up the 4K render engine...",
    "Analyzing prompt for cinematic potential...",
    "Generating initial storyboards...",
    "Compositing visual layers...",
    "Applying advanced color grading...",
    "Synchronizing visuals with audio cues...",
    "Rendering keyframes in Ultra HD...",
    "Polishing the final cut...",
    "Finalizing 4K output. This may take a few minutes...",
];

const handleGenerationProcess = async (
    generationPromise: Promise<any>,
    ai: GoogleGenAI,
    onProgress: (message: string) => void
) => {
    let messageIndex = 0;
    const updateProgress = () => {
        onProgress(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    };
    updateProgress();

    try {
        let operation = await generationPromise;
        const progressInterval = setInterval(updateProgress, 8000);

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        clearInterval(progressInterval);
        onProgress("Generation complete! Fetching video...");

        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const video = operation.response?.generatedVideos?.[0]?.video;
        const downloadLink = video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation succeeded, but no download link was provided.");
        }

        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes("Requested entity was not found.")) {
                throw new Error("API key not found. Please re-select your API key.");
            }
            throw new Error(`Failed to download video file. Status: ${response.status}. Message: ${errorText}`);
        }

        const videoBlob = await response.blob();
        onProgress("Video downloaded successfully.");
        return { video, videoBlob };
    } catch (error) {
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error);
        }
        if (error instanceof Error && error.message.includes("API key not found")) {
            if (window.aistudio) await window.aistudio.openSelectKey();
        }
        console.error("Error during video generation:", error);
        throw error;
    }
};


export const generateVideo = async (
  prompt: string,
  resolution: '720p' | '1080p',
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void
): Promise<{ videoUrl: string; veoVideo: any; resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }> => {
  const ai = await getAiClient(onProgress);

  // Use the higher-quality model if 1080p is requested for better results.
  const model = resolution === '1080p' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

  const generationPromise = ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
    }
  });
  const { video, videoBlob } = await handleGenerationProcess(generationPromise, ai, onProgress);
  return {
    videoUrl: URL.createObjectURL(videoBlob),
    veoVideo: video,
    resolution: resolution,
    aspectRatio: aspectRatio,
  };
};

export const regenerateVideo = async (
  prompt: string,
  resolution: '720p' | '1080p',
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void
): Promise<{ videoUrl: string; veoVideo: any; resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }> => {
    const ai = await getAiClient(onProgress);
    const generationPromise = ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio,
      }
    });
    const { video, videoBlob } = await handleGenerationProcess(generationPromise, ai, onProgress);
    return {
      videoUrl: URL.createObjectURL(videoBlob),
      veoVideo: video,
      resolution: resolution,
      aspectRatio: aspectRatio,
    };
};

export const extendVideo = async (
  prompt: string,
  previousVideo: any,
  onProgress: (message: string) => void
): Promise<{ videoUrl: string; veoVideo: any; resolution: '720p'; aspectRatio: '16:9' }> => {
    const ai = await getAiClient(onProgress);
    const generationPromise = ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: prompt,
      video: previousVideo,
      config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9',
      }
    });
    const { video, videoBlob } = await handleGenerationProcess(generationPromise, ai, onProgress);
    return {
      videoUrl: URL.createObjectURL(videoBlob),
      veoVideo: video,
      resolution: '720p',
      aspectRatio: '16:9',
    };
};

export const getPromptSuggestions = async (currentPrompt: string): Promise<string[]> => {
    if (!currentPrompt || currentPrompt.trim().length < 5) {
        return [];
    }
    
    // Use a no-op progress handler for this silent API call
    const ai = await getAiClient(() => {}); 
    
    try {
        const fullPrompt = `You are a creative assistant for a music video director. Based on the following prompt fragment, suggest 5 creative, evocative keywords or short phrases to add. The suggestions should be concise and inspiring. Return them as a single, comma-separated string without any introductory text. For example: "neon rain, vintage car, slow motion, glitch effect, lens flare".

Prompt Fragment: "${currentPrompt}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        
        const text = response.text;
        if (!text) return [];

        return text.split(',').map(s => s.trim().replace(/"/g, ''));

    } catch (error) {
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error);
        }
        console.error("Error fetching prompt suggestions:", error);
        return []; // Return empty array on error to avoid breaking the UI
    }
};


// --- AI Studio Assistant Chat Service ---

const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'update_camera_controls',
        description: 'Update camera settings like zoom, pan, tilt, or depth of field to an absolute value.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                zoom: { type: Type.NUMBER, description: 'Zoom level from 0 to 100.' },
                pan: { type: Type.NUMBER, description: 'Pan level from -50 to 50.' },
                tilt: { type: Type.NUMBER, description: 'Tilt level from -50 to 50.' },
                depthOfField: { type: Type.STRING, description: "Depth of field. Can be 'Low', 'Medium', or 'High'." },
            },
            required: []
        },
    },
    {
        name: 'adjust_camera_controls',
        description: 'Adjust camera settings relatively, e.g., "increase zoom by 10". Use positive values to increase and negative to decrease.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                zoom_delta: { type: Type.NUMBER, description: 'Amount to change zoom by. Can be positive or negative.' },
                pan_delta: { type: Type.NUMBER, description: 'Amount to change pan by. Can be positive or negative.' },
                tilt_delta: { type: Type.NUMBER, description: 'Amount to change tilt by. Can be positive or negative.' },
            },
            required: []
        },
    },
    {
        name: 'update_ai_polish',
        description: 'Update the AI polish filters like mood vibrancy and sync intensity to an absolute value.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                moodVibrancy: { type: Type.NUMBER, description: 'Mood vibrancy level from 0 to 100.' },
                syncIntensity: { type: Type.NUMBER, description: 'Sync intensity level from 0 to 100.' },
            },
            required: []
        },
    },
     {
        name: 'adjust_ai_polish',
        description: 'Adjust AI polish filters relatively. Use positive values to increase and negative to decrease.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                moodVibrancy_delta: { type: Type.NUMBER, description: 'Amount to change mood vibrancy by.' },
                syncIntensity_delta: { type: Type.NUMBER, description: 'Amount to change sync intensity by.' },
            },
            required: []
        },
    },
    {
        name: 'update_audio_mix',
        description: 'Update the volume mix for different audio stems to an absolute value.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                drums: { type: Type.NUMBER, description: 'Volume of drums from 0 to 100.' },
                vocals: { type: Type.NUMBER, description: 'Volume of vocals from 0 to 100.' },
                bass: { type: Type.NUMBER, description: 'Volume of bass from 0 to 100.' },
                melody: { type: Type.NUMBER, description: 'Volume of melody from 0 to 100.' },
            },
            required: []
        },
    },
    {
        name: 'adjust_audio_mix',
        description: 'Adjust the volume mix for audio stems relatively. Use positive values to increase and negative to decrease.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                drums_delta: { type: Type.NUMBER, description: 'Amount to change drums volume by.' },
                vocals_delta: { type: Type.NUMBER, description: 'Amount to change vocals volume by.' },
                bass_delta: { type: Type.NUMBER, description: 'Amount to change bass volume by.' },
                melody_delta: { type: Type.NUMBER, description: 'Amount to change melody volume by.' },
            },
            required: []
        },
    },
    {
        name: 'change_visualizer',
        description: 'Change the style of the timeline visualizer.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                style: { type: Type.STRING, description: "The visualizer style. Can be 'Waveform', 'Bars', or 'Particles'." },
            },
            required: ['style']
        },
    }
];

let chat: Chat | null = null;

export const startAIChatSession = async (): Promise<void> => {
    try {
        const ai = await getAiClient(() => {});
        const systemInstruction = `You are a helpful and creative AI assistant inside a music video creation app called Narrator Pro. Your goal is to help the user polish their video. You can control parts of the app for them using the available tools. When a user asks you to make a change, use the provided functions. Also provide helpful, concise, and encouraging text responses. If a user asks for a creative suggestion, provide one. Always confirm the action you've taken in your text response.`;

        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools: [{ functionDeclarations }],
            },
        });
    } catch (error) {
        console.error("Error starting AI chat session:", error);
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error);
        }
        throw new Error("Could not initialize AI Assistant.");
    }
};

export const sendChatMessage = async (message: string): Promise<GenerateContentResponse> => {
    if (!chat) {
        await startAIChatSession();
    }
    
    if (!chat) { // Check again after attempting to start
      throw new Error("AI Assistant is not available.");
    }

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ contents: message });
        return response;
    } catch (error) {
        console.error("Error sending chat message:", error);
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error);
        }
        throw new Error("Failed to get response from AI Assistant.");
    }
};

export const generateSpeech = async (script: string, voiceName: string): Promise<string> => {
    try {
        const ai = await getAiClient(() => {}); // Use a silent progress handler
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text: script }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("API did not return audio data.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error);
        }
        throw new Error("Failed to generate voiceover.");
    }
};

// --- AI Suggestion Services ---

export const getStudioSuggestions = async (prompt: string): Promise<{moodVibrancy: number, syncIntensity: number, storyboardIdeas: string[]}> => {
    const ai = await getAiClient(() => {});
    const schema = {
        type: Type.OBJECT,
        properties: {
            moodVibrancy: {
                type: Type.NUMBER,
                description: 'A value from 0-100 representing the mood. E.g., for "dark and moody", it should be low (20-40). For "vibrant and energetic", it should be high (70-90).'
            },
            syncIntensity: {
                type: Type.NUMBER,
                description: 'A value from 0-100 representing how strongly visuals should sync to music. E.g., for a high-energy rap video, it might be high (75-95). For an ambient track, low (10-30).'
            },
            storyboardIdeas: {
                type: Type.ARRAY,
                description: 'A list of 3-5 concise, creative storyboard scene ideas based on the prompt. Each idea should be a short, actionable phrase.',
                items: {
                    type: Type.STRING
                }
            }
        },
        required: ['moodVibrancy', 'syncIntensity', 'storyboardIdeas']
    };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following music video prompt and provide settings and creative ideas. Prompt: "${prompt}"`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });
        const json = JSON.parse(response.text);
        if (json.moodVibrancy !== undefined && json.syncIntensity !== undefined && Array.isArray(json.storyboardIdeas)) {
            return json;
        } else {
            throw new Error("Invalid JSON structure from AI.");
        }
    } catch (error) {
        console.error("Error getting studio suggestions:", error);
        if (typeof Sentry !== 'undefined') { Sentry.captureException(error); }
        return { moodVibrancy: 50, syncIntensity: 60, storyboardIdeas: ["Error: Could not fetch suggestions."] };
    }
};

export const generateVoiceoverScript = async (prompt: string): Promise<string> => {
    const ai = await getAiClient(() => {});
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on this music video prompt, write a short, evocative 15-20 word narration script that could be used as a voiceover. Do not include quotation marks. Prompt: "${prompt}"`
        });
        return response.text.trim().replace(/"/g, '');
    } catch (error) {
        console.error("Error generating voiceover script:", error);
        if (typeof Sentry !== 'undefined') { Sentry.captureException(error); }
        return "Failed to generate script.";
    }
};

export const getProactiveSuggestion = async (prompt: string): Promise<string> => {
    const ai = await getAiClient(() => {});
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an AI assistant in a video editor. Your user just opened a project with this prompt: "${prompt}". Give one, short, proactive suggestion to improve the video. Frame it as a question and keep it concise. For example: "I see your prompt is about a 'lone astronaut'. How about we add a 'low depth of field' to emphasize the isolation?" or "Your prompt has a very energetic feel. Shall I increase the sync intensity to 80 for more impact?"`
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting proactive suggestion:", error);
        if (typeof Sentry !== 'undefined') { Sentry.captureException(error); }
        return "I had a creative idea, but I seem to have lost it. How can I help you today?";
    }
};
