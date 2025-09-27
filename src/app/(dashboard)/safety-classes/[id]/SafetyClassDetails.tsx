"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Clock, Users, Calendar, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SchedulingModal from "./SchedulingModal";
import { SafetyClass } from "../types";

interface SafetyClassDetailsProps {
  safetyClass: SafetyClass;
  isSuperAdmin: boolean;
  currentFirmId: string;
}

export default function SafetyClassDetails({ safetyClass, isSuperAdmin, currentFirmId }: SafetyClassDetailsProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration_, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    setTimeout(() => setShowControls(false), 3000);
  };

  const handleSchedule = () => {
    setIsSchedulingModalOpen(true);
  };

  const benefits = [
    "Understand the importance of workplace safety",
    "Identify common hazards and risk factors",
    "Learn proactive measures to reduce accidents",
    "Promote a safety-first mindset across teams"
  ];

  return (
    <div className="max-w-6xl">
      {/* Breadcrumb and Back Button */}
      {/* <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Safety Classes
        </Button>
        <div className="text-sm text-gray-500">
          Home &gt; Safety Classes &gt; {safetyClass.title.substring(0, 30)}...
        </div>
      </div> */}

      <div className="">
        {/* Main Content - Video and Details */}
        <div className="lg:col-span-2">
          {/* Video Player */}
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="relative rounded-t-lg">
                <div
                  className="relative bg-black rounded-t-lg m-6 mt-0"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setShowControls(false)}
                >
                  <video
                    ref={videoRef}
                    className="w-full aspect-video rounded-t-lg h-100"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={() => {
                      setIsLoading(false);
                      setHasError(true);
                    }}
                  >
                    <source src={safetyClass.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Video Controls Overlay */}
                  {showControls && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 rounded-b-lg">
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <input
                          type="range"
                          min="0"
                          max={duration_ || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className="h-8 w-8 text-white hover:bg-white/20"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            className="h-8 w-8 text-white hover:bg-white/20"
                          >
                            {isMuted ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>

                          <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration_)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = 0;
                                setCurrentTime(0);
                              }
                            }}
                            className="h-8 w-8 text-white hover:bg-white/20"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.requestFullscreen();
                              }
                            }}
                            className="h-8 w-8 text-white hover:bg-white/20"
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  {!isPlaying && showControls && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="h-16 w-16 bg-white/20 hover:bg-white/30 text-white rounded-full"
                      >
                        <Play className="h-8 w-8 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Loading video...</p>
                      </div>
                    </div>
                  )}

                  {/* Error Overlay */}
                  {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white text-center">
                        <div className="text-red-400 mb-2">⚠️</div>
                        <p className="text-sm">Failed to load video</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHasError(false);
                            setIsLoading(true);
                            if (videoRef.current) {
                              videoRef.current.load();
                            }
                          }}
                          className="mt-2 text-white border-white hover:bg-white/20"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pl-6 pr-0">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {safetyClass.title}
                  </h1>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{safetyClass.duration_minutes} min</span>
                    </div>
                    {safetyClass.is_required && (
                      <Badge variant="destructive">Required</Badge>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-1">About Classes</h2>
                  <p className="text-gray-700 leading-relaxed">
                    {safetyClass.description}
                  </p>

                  <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-1">Why Us?</h2>
                  <ul className="space-y-3">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={handleSchedule}
                    className="mt-6 bg-brand-orange hover:bg-brand-orange/90 text-white"
                  >
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={isSchedulingModalOpen}
        onClose={() => setIsSchedulingModalOpen(false)}
        safetyClass={{
          id: safetyClass.id,
          title: safetyClass.title,
          duration: safetyClass.duration_minutes,
          isRemote: safetyClass?.isRemote ?? false,
        }}
        firmId={currentFirmId}
      />
    </div>
  );
}
