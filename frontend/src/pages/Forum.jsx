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
  People as PeopleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { groupService, forumService, authService } from "../services/api";
import Calendar from "../components/Calendar/Calendar";
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
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [editPostDialogOpen, setEditPostDialogOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [editingPostTitle, setEditingPostTitle] = useState("");
  const [editingPostContent, setEditingPostContent] = useState("");
  const [updatingPost, setUpdatingPost] = useState(false);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [editCommentDialogOpen, setEditCommentDialogOpen] = useState(false);
  const [commentToEdit, setCommentToEdit] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [updatingComment, setUpdatingComment] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

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
          
          // Jelöljük meg a posztokat olvasottnak, amikor a felhasználó megnyitja a fórumot
          try {
            await groupService.markGroupPostsRead(groupId);
          } catch (err) {
            console.error("Posztok olvasottnak jelölési hiba:", err);
            // Nem kritikus hiba, nem dobjuk el a folyamatot
          }
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

  const handleViewMembers = async () => {
    setMembersModalOpen(true);
    setSelectedGroupMembers(null);

    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members || []);
    } catch (err) {
      console.error("Tagok hiba:", err);
      setError(err.message || "Hiba történt a tagok lekérése során");
      setSelectedGroupMembers([]);
    }
  };

  const handleCloseMembersModal = () => {
    setMembersModalOpen(false);
    setSelectedGroupMembers(null);
  };

  const handleDeletePost = (post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    setDeletingPost(true);
    setError(null);

    try {
      await forumService.deletePost(postToDelete.id);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
      await fetchPosts();
    } catch (err) {
      console.error("Poszt törlési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a poszt törlése során"
      );
    } finally {
      setDeletingPost(false);
    }
  };

  const cancelDeletePost = () => {
    setDeleteDialogOpen(false);
    setPostToDelete(null);
  };

  const handleEditPost = (post) => {
    setPostToEdit(post);
    setEditingPostTitle(post.title);
    setEditingPostContent(post.content);
    setEditPostDialogOpen(true);
  };

  const confirmEditPost = async () => {
    if (!postToEdit || !editingPostTitle.trim() || !editingPostContent.trim()) {
      return;
    }

    setUpdatingPost(true);
    setError(null);

    try {
      await forumService.updatePost(
        postToEdit.id,
        editingPostTitle,
        editingPostContent
      );
      setEditPostDialogOpen(false);
      setPostToEdit(null);
      setEditingPostTitle("");
      setEditingPostContent("");
      await fetchPosts();
    } catch (err) {
      console.error("Poszt szerkesztési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a poszt szerkesztése során"
      );
    } finally {
      setUpdatingPost(false);
    }
  };

  const cancelEditPost = () => {
    setEditPostDialogOpen(false);
    setPostToEdit(null);
    setEditingPostTitle("");
    setEditingPostContent("");
  };

  const handleDeleteComment = (comment, postId) => {
    setCommentToDelete({ ...comment, postId });
    setDeleteCommentDialogOpen(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeletingComment(true);
    setError(null);

    try {
      await forumService.deleteComment(commentToDelete.id);
      setDeleteCommentDialogOpen(false);
      // Frissítjük a kommenteket a poszthoz
      const updatedComments = comments[commentToDelete.postId] || [];
      setComments({
        ...comments,
        [commentToDelete.postId]: updatedComments.filter(
          (c) => c.id !== commentToDelete.id
        ),
      });
      setCommentToDelete(null);
    } catch (err) {
      console.error("Komment törlési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a komment törlése során"
      );
    } finally {
      setDeletingComment(false);
    }
  };

  const cancelDeleteComment = () => {
    setDeleteCommentDialogOpen(false);
    setCommentToDelete(null);
  };

  const handleEditComment = (comment) => {
    setCommentToEdit(comment);
    setEditingCommentContent(comment.content);
    setEditCommentDialogOpen(true);
  };

  const confirmEditComment = async () => {
    if (!commentToEdit || !editingCommentContent.trim()) {
      return;
    }

    setUpdatingComment(true);
    setError(null);

    try {
      const updatedComment = await forumService.updateComment(
        commentToEdit.id,
        editingCommentContent
      );
      setEditCommentDialogOpen(false);
      // Frissítjük a kommenteket a poszthoz
      const updatedComments = comments[commentToEdit.post_id] || [];
      setComments({
        ...comments,
        [commentToEdit.post_id]: updatedComments.map((c) =>
          c.id === commentToEdit.id ? updatedComment : c
        ),
      });
      setCommentToEdit(null);
      setEditingCommentContent("");
    } catch (err) {
      console.error("Komment szerkesztési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt a komment szerkesztése során"
      );
    } finally {
      setUpdatingComment(false);
    }
  };

  const cancelEditComment = () => {
    setEditCommentDialogOpen(false);
    setCommentToEdit(null);
    setEditingCommentContent("");
  };

  const getCurrentUserId = () => {
    const user = authService.getUser();
    return user ? user.id : null;
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
            p: 3,
            borderRadius: "20px",
            background:
              "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
            border: "1px solid rgba(102, 126, 234, 0.1)",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.1)",
          }}
        >
          <IconButton
            onClick={() => navigate("/dashboard")}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                transform: "scale(1.05)",
              },
              transition: "transform 0.2s",
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
                mb: 0.5,
              }}
            >
              {group?.name || "Forum"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {group?.subject || "Csoport forum"}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setCalendarModalOpen(true)}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                transform: "scale(1.05)",
              },
              transition: "transform 0.2s",
              mr: 1,
            }}
            title="Naptár megtekintése"
          >
            <CalendarIcon />
          </IconButton>
          <IconButton
            onClick={handleViewMembers}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                transform: "scale(1.05)",
              },
              transition: "transform 0.2s",
              mr: 1,
            }}
            title="Csoporttagok megtekintése"
          >
            <PeopleIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenPostDialog(true)}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1.5,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                transform: "translateY(-2px)",
              },
              transition: "all 0.2s",
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
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      mb: 3,
                    }}
                  >
                    <Box flex={1}>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: "#333",
                          mb: 1.5,
                          lineHeight: 1.3,
                        }}
                      >
                        {post.title}
                      </Typography>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {formatDate(post.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                    {post.author_id === getCurrentUserId() && (
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          onClick={() => handleEditPost(post)}
                          sx={{
                            color: "#667eea",
                            "&:hover": {
                              backgroundColor: "rgba(102, 126, 234, 0.1)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                          title="Poszt szerkesztése"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeletePost(post)}
                          sx={{
                            color: "#d32f2f",
                            "&:hover": {
                              backgroundColor: "rgba(211, 47, 47, 0.1)",
                              transform: "scale(1.1)",
                            },
                            transition: "all 0.2s",
                          }}
                          title="Poszt törlése"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "#555",
                      mb: 3,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.8,
                      fontSize: "1rem",
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
                                        mb: 2.5,
                                        p: 2.5,
                                        borderRadius: "16px",
                                        background:
                                          "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
                                        border:
                                          "1px solid rgba(102, 126, 234, 0.15)",
                                        transition: "all 0.2s",
                                        "&:hover": {
                                          border:
                                            "1px solid rgba(102, 126, 234, 0.3)",
                                          boxShadow:
                                            "0 2px 8px rgba(102, 126, 234, 0.1)",
                                        },
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "flex-start",
                                          mb: 1.5,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            flex: 1,
                                          }}
                                        >
                                          <Avatar
                                            sx={{
                                              width: 40,
                                              height: 40,
                                              background:
                                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                              color: "white",
                                              fontSize: "0.9rem",
                                              fontWeight: 600,
                                              boxShadow:
                                                "0 2px 8px rgba(102, 126, 234, 0.3)",
                                            }}
                                          >
                                            {getAuthorInitials(
                                              comment.author_id
                                            )}
                                          </Avatar>
                                          <Box>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              sx={{
                                                display: "block",
                                                fontSize: "0.75rem",
                                              }}
                                            >
                                              {formatDate(comment.created_at)}
                                            </Typography>
                                          </Box>
                                        </Box>
                                        {comment.author_id ===
                                          getCurrentUserId() && (
                                          <Box
                                            sx={{ display: "flex", gap: 0.5 }}
                                          >
                                            <IconButton
                                              onClick={() =>
                                                handleEditComment(comment)
                                              }
                                              sx={{
                                                color: "#667eea",
                                                "&:hover": {
                                                  backgroundColor:
                                                    "rgba(102, 126, 234, 0.1)",
                                                  transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s",
                                              }}
                                              title="Komment szerkesztése"
                                              size="small"
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                              onClick={() =>
                                                handleDeleteComment(
                                                  comment,
                                                  post.id
                                                )
                                              }
                                              sx={{
                                                color: "#d32f2f",
                                                "&:hover": {
                                                  backgroundColor:
                                                    "rgba(211, 47, 47, 0.1)",
                                                  transform: "scale(1.1)",
                                                },
                                                transition: "all 0.2s",
                                              }}
                                              title="Komment törlése"
                                              size="small"
                                            >
                                              <DeleteIcon fontSize="small" />
                                            </IconButton>
                                          </Box>
                                        )}
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: "#444",
                                          lineHeight: 1.6,
                                          pl: 5.5,
                                        }}
                                      >
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
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600,
            borderRadius: "24px 24px 0 0",
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

      {/* Tagok lista Modal */}
      <Dialog
        open={membersModalOpen}
        onClose={handleCloseMembersModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              Tagok - {group?.name || "Csoport"}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroupMembers === null ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tagok betöltése...
              </Typography>
            </Box>
          ) : selectedGroupMembers.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Még nincsenek tagok ebben a csoportban.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {selectedGroupMembers.map((member, index) => (
                <Box key={member.user_id || index}>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    sx={{ py: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                      }}
                    >
                      {getInitials(member.name || member.email)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {member.name || "Névtelen felhasználó"}
                      </Typography>
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 0.25 }}
                        >
                          {member.email || "Nincs email"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.major || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {index < selectedGroupMembers.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseMembersModal}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Post Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeletePost}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(211, 47, 47, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            fontWeight: 600,
          }}
        >
          Poszt törlése
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Biztosan törölni szeretnéd ezt a posztot?
          </Typography>
          {postToDelete && (
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(211, 47, 47, 0.05)",
                border: "1px solid rgba(211, 47, 47, 0.2)",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                {postToDelete.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {postToDelete.content.substring(0, 100)}
                {postToDelete.content.length > 100 ? "..." : ""}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Ez a művelet nem visszavonható!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cancelDeletePost}
            disabled={deletingPost}
            sx={{ color: "#666" }}
          >
            Mégse
          </Button>
          <Button
            onClick={confirmDeletePost}
            variant="contained"
            disabled={deletingPost}
            sx={{
              background: "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #b71c1c 0%, #a01515 100%)",
              },
            }}
          >
            {deletingPost ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Törlés"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog
        open={editPostDialogOpen}
        onClose={cancelEditPost}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600,
            borderRadius: "24px 24px 0 0",
          }}
        >
          Poszt szerkesztése
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Cím"
            value={editingPostTitle}
            onChange={(e) => setEditingPostTitle(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Tartalom"
            value={editingPostContent}
            onChange={(e) => setEditingPostContent(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cancelEditPost}
            disabled={updatingPost}
            sx={{ color: "#666" }}
          >
            Mégse
          </Button>
          <Button
            onClick={confirmEditPost}
            variant="contained"
            disabled={
              updatingPost ||
              !editingPostTitle.trim() ||
              !editingPostContent.trim()
            }
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            {updatingPost ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Mentés"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Comment Confirmation Dialog */}
      <Dialog
        open={deleteCommentDialogOpen}
        onClose={cancelDeleteComment}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(211, 47, 47, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            fontWeight: 600,
          }}
        >
          Komment törlése
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Biztosan törölni szeretnéd ezt a kommentet?
          </Typography>
          {commentToDelete && (
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                backgroundColor: "rgba(211, 47, 47, 0.05)",
                border: "1px solid rgba(211, 47, 47, 0.2)",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {commentToDelete.content.substring(0, 100)}
                {commentToDelete.content.length > 100 ? "..." : ""}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Ez a művelet nem visszavonható!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cancelDeleteComment}
            disabled={deletingComment}
            sx={{ color: "#666" }}
          >
            Mégse
          </Button>
          <Button
            onClick={confirmDeleteComment}
            variant="contained"
            disabled={deletingComment}
            sx={{
              background: "linear-gradient(135deg, #d32f2f 0%, #c62828 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #b71c1c 0%, #a01515 100%)",
              },
            }}
          >
            {deletingComment ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Törlés"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Comment Dialog */}
      <Dialog
        open={editCommentDialogOpen}
        onClose={cancelEditComment}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontWeight: 600,
            borderRadius: "24px 24px 0 0",
          }}
        >
          Komment szerkesztése
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Komment tartalma"
            value={editingCommentContent}
            onChange={(e) => setEditingCommentContent(e.target.value)}
            required
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={cancelEditComment}
            disabled={updatingComment}
            sx={{ color: "#666" }}
          >
            Mégse
          </Button>
          <Button
            onClick={confirmEditComment}
            variant="contained"
            disabled={updatingComment || !editingCommentContent.trim()}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            {updatingComment ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Mentés"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calendar Modal */}
      <Calendar
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        groupId={groupId}
      />
    </div>
  );
};

export default Forum;
