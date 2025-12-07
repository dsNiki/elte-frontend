import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Avatar,
  Chip,
  Alert,
  Collapse,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Forum as ForumIcon,
  Add as AddIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { groupService, forumService } from "../services/api";
import "./Dashboard.css";

const Forum = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [openPostDialog, setOpenPostDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [comments, setComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [groupMembers, setGroupMembers] = useState([]);

  const fetchPosts = useCallback(async () => {
    if (!groupId) return;
    try {
      const postsData = await forumService.getPosts(groupId);
      setPosts(postsData);
    } catch (err) {
      console.error("Posztok betöltési hiba:", err);
      setError(err.message || "Hiba történt a posztok betöltése során");
    }
  }, [groupId]);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupId) {
        setShouldRedirect(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Ellenőrizzük, hogy a felhasználó tagja-e a csoportnak
        const response = await groupService.myGroups();
        const foundGroup = response.groups?.find(
          (g) => g.id === parseInt(groupId)
        );

        if (foundGroup) {
          setGroup(foundGroup);
          // Csoporttagok betöltése a monogramokhoz
          try {
            const membersData = await groupService.getGroupMembers(groupId);
            setGroupMembers(membersData || []);
          } catch (err) {
            console.error("Csoporttagok betöltési hiba:", err);
          }
          // Posztok betöltése
          await fetchPosts();
        } else {
          setShouldRedirect(true);
        }
      } catch (err) {
        console.error("Csoport betöltési hiba:", err);
        setError(err.message || "Hiba történt a csoport betöltése során");
        setShouldRedirect(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupId, fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      setError("A cím és a tartalom megadása kötelező!");
      return;
    }

    setSubmittingPost(true);
    setError(null);
    setOpenPostDialog(false);

    try {
      await forumService.createPost(groupId, newPostTitle, newPostContent);
      setNewPostTitle("");
      setNewPostContent("");
      await fetchPosts();
    } catch (err) {
      console.error("Poszt létrehozási hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a poszt létrehozása során"
      );
    } finally {
      setSubmittingPost(false);
    }
  };

  const togglePostExpanded = async (postId) => {
    const isExpanded = expandedPosts[postId];
    setExpandedPosts({ ...expandedPosts, [postId]: !isExpanded });

    // Ha kinyitjuk és még nincsenek betöltve a kommentek, betöltjük
    if (!isExpanded && !comments[postId]) {
      setLoadingComments({ ...loadingComments, [postId]: true });
      try {
        const commentsData = await forumService.getComments(postId);
        setComments({ ...comments, [postId]: commentsData });
      } catch (err) {
        console.error("Kommentek betöltési hiba:", err);
        setError(
          err.response?.data?.error ||
            "Hiba történt a kommentek betöltése során"
        );
      } finally {
        setLoadingComments({ ...loadingComments, [postId]: false });
      }
    }
  };

  const handleCreateComment = async (postId) => {
    const commentContent = newComments[postId];
    if (!commentContent || !commentContent.trim()) {
      return;
    }

    setSubmittingComment({ ...submittingComment, [postId]: true });
    setError(null);

    try {
      const newComment = await forumService.createComment(
        postId,
        commentContent
      );
      // Hozzáadjuk a kommentekhez
      const updatedComments = comments[postId] || [];
      setComments({ ...comments, [postId]: [...updatedComments, newComment] });
      setNewComments({ ...newComments, [postId]: "" });
    } catch (err) {
      console.error("Komment létrehozási hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a komment létrehozása során"
      );
    } finally {
      setSubmittingComment({ ...submittingComment, [postId]: false });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAuthorInitials = (authorId) => {
    const member = groupMembers.find((m) => m.user_id === authorId);
    if (member) {
      return getInitials(member.name || member.email);
    }
    return "U";
  };

  // Ha nincs hozzáférés, azonnal redirect
  if (shouldRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Ha nincs csoport vagy hiba van, akkor redirect
  if (error && !group) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className="dashboard-container"
      style={{
        minHeight: "100vh",
        padding: "20px",
        backgroundColor: "#f5f7fa",
      }}
    >
      <Box sx={{ maxWidth: "1200px", mx: "auto", p: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 4,
          }}
        >
          <IconButton
            onClick={() => navigate("/dashboard")}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box flex={1}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {group?.name || "Forum"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {group?.subject || "Csoport forum"}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenPostDialog(true)}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            Új poszt
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <Card
            sx={{
              borderRadius: "20px",
              border: "1px solid rgba(102, 126, 234, 0.2)",
              boxShadow: "0 4px 20px rgba(102, 126, 234, 0.1)",
              backgroundColor: "white",
            }}
          >
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <ForumIcon
                sx={{
                  fontSize: 80,
                  color: "#667eea",
                  mb: 2,
                }}
              />
              <Typography
                variant="h5"
                sx={{ mb: 2, fontWeight: 600, color: "#333" }}
              >
                Még nincsenek posztok
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Legyél te az első, aki posztot ír!
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {posts.map((post) => (
              <Card
                key={post.id}
                sx={{
                  borderRadius: "20px",
                  border: "1px solid rgba(102, 126, 234, 0.2)",
                  boxShadow: "0 4px 20px rgba(102, 126, 234, 0.1)",
                  backgroundColor: "white",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 25px rgba(102, 126, 234, 0.15)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Box flex={1}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#333",
                          mb: 1,
                        }}
                      >
                        {post.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {formatDate(post.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "#555",
                      mb: 2,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {post.content}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Comments Section */}
                  <Box>
                    <Button
                      startIcon={
                        expandedPosts[post.id] ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      endIcon={<CommentIcon />}
                      onClick={() => togglePostExpanded(post.id)}
                      sx={{
                        color: "#667eea",
                        textTransform: "none",
                        mb: expandedPosts[post.id] ? 2 : 0,
                      }}
                    >
                      {expandedPosts[post.id]
                        ? "Kommentek elrejtése"
                        : "Kommentek megjelenítése"}
                      {comments[post.id] && ` (${comments[post.id].length})`}
                    </Button>

                    <Collapse in={expandedPosts[post.id]}>
                      <Box sx={{ mt: 2 }}>
                        {loadingComments[post.id] ? (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              p: 2,
                            }}
                          >
                            <CircularProgress size={24} />
                          </Box>
                        ) : (
                          <>
                            {/* Comments List */}
                            {comments[post.id] &&
                              comments[post.id].length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                  {comments[post.id].map((comment) => (
                                    <Box
                                      key={comment.id}
                                      sx={{
                                        mb: 2,
                                        p: 2,
                                        borderRadius: "12px",
                                        background:
                                          "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
                                        border:
                                          "1px solid rgba(102, 126, 234, 0.1)",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                          mb: 1,
                                        }}
                                      >
                                        <Avatar
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            bgcolor: "#667eea",
                                            fontSize: "0.875rem",
                                          }}
                                        >
                                          {getAuthorInitials(comment.author_id)}
                                        </Avatar>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {formatDate(comment.created_at)}
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2">
                                        {comment.content}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}

                            {/* Add Comment Form */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "flex-start",
                              }}
                            >
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Írj egy kommentet..."
                                value={newComments[post.id] || ""}
                                onChange={(e) =>
                                  setNewComments({
                                    ...newComments,
                                    [post.id]: e.target.value,
                                  })
                                }
                                variant="outlined"
                                size="small"
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                  },
                                }}
                              />
                              <IconButton
                                onClick={() => handleCreateComment(post.id)}
                                disabled={submittingComment[post.id]}
                                sx={{
                                  background:
                                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  color: "white",
                                  "&:hover": {
                                    background:
                                      "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                                  },
                                  "&:disabled": {
                                    background: "#ccc",
                                  },
                                }}
                              >
                                {submittingComment[post.id] ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <SendIcon />
                                )}
                              </IconButton>
                            </Box>
                          </>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Create Post Dialog */}
      <Dialog
        open={openPostDialog}
        onClose={() => setOpenPostDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600,
          }}
        >
          Új poszt létrehozása
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Cím"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Tartalom"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPostDialog(false)}>Mégse</Button>
          <Button
            onClick={handleCreatePost}
            variant="contained"
            disabled={
              submittingPost || !newPostTitle.trim() || !newPostContent.trim()
            }
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            {submittingPost ? <CircularProgress size={20} /> : "Létrehozás"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Forum;
