// src/components/SubjectGroupSearch.jsx
import React, { useState } from "react";
import {
  Avatar,
  Divider,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Add as AddIcon, People as PeopleIcon } from "@mui/icons-material";
import { subjectService, groupService } from "../services/api";
  

const SubjectGroupSearch = () => {
  const [query, setQuery] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(""); // tárgynév string
  const [groups, setGroups] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  const [error, setError] = useState("");
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");


  const isUserMemberOfGroup = (group) => group.is_member === true;
  const hasSubjects = subjects.length > 0;


  // 1) Tantárgyak keresése ELTE tanrendből
  const handleSearchSubjects = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoadingSubjects(true);
    setError("");
    setSelectedSubject("");
    setGroups([]);

    try {
      const data = await subjectService.searchSubjects(query); // [{code, name}]
      setSubjects(data);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült a tantárgyak keresése.");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  // 2) Tantárgy kiválasztása → /groups/search a tárgynévvel
  const handleSelectSubject = async (subject) => {
    const name = subject.name;
    setSelectedSubject(name);
    setGroups([]);
    setError("");
    setLoadingGroups(true);

    try {
      const response = await groupService.searchGroups(name); // /groups/search?q=...

      const allGroups = [];
      const seenIds = new Set();

      if (response.all_groups && Array.isArray(response.all_groups)) {
        response.all_groups.forEach((group) => {
          if (!seenIds.has(group.id)) {
            allGroups.push(group);
            seenIds.add(group.id);
          }
        });
      }

      if (
        response.recommended_group &&
        !seenIds.has(response.recommended_group.id)
      ) {
        allGroups.push(response.recommended_group);
      }

      setGroups(allGroups);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült a csoportok betöltése.");
    } finally {
      setLoadingGroups(false);
    }
  };

  // 3) Csatlakozás csoporthoz → /groups/join + újratöltés ugyanarra a tárgyra
  const handleJoinGroup = async (groupId) => {
    if (!groupId) return;
    setJoiningGroupId(groupId);
    setError("");

    try {
      await groupService.joinGroup(groupId);

      if (selectedSubject) {
        const response = await groupService.searchGroups(selectedSubject);
        const allGroups = [];
        const seenIds = new Set();

        if (response.all_groups && Array.isArray(response.all_groups)) {
          response.all_groups.forEach((group) => {
            if (!seenIds.has(group.id)) {
              allGroups.push(group);
              seenIds.add(group.id);
            }
          });
        }

        if (
          response.recommended_group &&
          !seenIds.has(response.recommended_group.id)
        ) {
          allGroups.push(response.recommended_group);
        }

        setGroups(allGroups);
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült csatlakozni a csoporthoz.");
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleViewMembers = async (groupId, groupName) => {
    setSelectedGroupName(groupName);
    setMembersModalOpen(true);
    setSelectedGroupMembers([]);

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
    setSelectedGroupMembers([]);
    setSelectedGroupName("");
  };



  return (
    <Box sx={{ maxWidth: "1100px", mx: "auto", mt: 4 }}>
  {/* CÍM + KERESŐ BLOKK */}
  <Box
    sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",             // mindig vízszintesen középen
        textAlign: "center",
        mb: hasSubjects ? 3 : 6,
        minHeight: hasSubjects ? "auto" : "40vh", // csak akkor középre függőlegesen, ha még nincs találat
        justifyContent: hasSubjects ? "flex-start" : "center",
    }}
  >
    <Typography
      variant="h4"
      sx={{
        mb: hasSubjects ? 2 : 4,            // nagyobb térköz a cím után, ha üres
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      Tantárgy alapú csoportkeresés
    </Typography>

    {/* Kereső sor */}
    <Box
      component="form"
      onSubmit={handleSearchSubjects}
      sx={{
        display: "flex",
        gap: 2,
        flexWrap: "wrap",
        justifyContent: "center", 
      }}
    >
      <TextField
        label="Tantárgy neve vagy kódja"
        variant="outlined"
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ minWidth: 260 }}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={loadingSubjects}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        Keresés
      </Button>
    </Box>
  </Box>

  {error && (
    <Alert
      severity="error"
      sx={{ mb: 2 }}
      onClose={() => setError("")}
    >
      {error}
    </Alert>
  )}

  {loadingSubjects && (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100px"
    >
      <CircularProgress />
    </Box>
  )}

  {/* Tantárgy lista */}
  {!loadingSubjects && subjects.length > 0 && !selectedSubject && (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Talált tantárgyak
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {subjects.map((s) => (
          <Button
            key={s.code}
            variant="outlined"
            size="medium"
            fullWidth
            onClick={() => handleSelectSubject(s)}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              borderRadius: "8px",
              paddingY: 1.5,
              paddingX: 2,
            }}
          >
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Tantárgy: {s.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kód: {s.code}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>
    </Box>
  )}

  {/* Csoportok a kiválasztott tantárgyhoz */}
  {selectedSubject && (
    <Box sx={{ mb: { xs: 4, md: 6 } }}>
      <Box
        sx={{
          mb: { xs: 3, md: 4 },  // Kisebb távolság
          p: { xs: 2, md: 3 },   // Kisebb padding
          borderRadius: { xs: 12, md: 16 },  // Kisebb kerekítés
          background:
            "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
          border: "1px solid rgba(76, 175, 80, 0.3)",
        }}
      >
        <Typography
          variant={{ xs: 'h5', sm: 'h4' }}  // h5 mobilon, h4 desktopon
          sx={{
            mb: 1,
            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: 700,
            fontSize: { xs: '1.4rem', sm: '1.6rem', md: '2rem' },  // Progresszív méret
            lineHeight: { xs: 1.2, md: 1.3 }
          }}
        >
          Elérhető csoportok
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: "#667eea",
            fontWeight: 600,
          }}
        >
          {selectedSubject}
        </Typography>
      </Box>

      {loadingGroups && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="120px"
        >
          <CircularProgress />
        </Box>
      )}

      {!loadingGroups && groups.length === 0 && (
        <Typography variant="body1">
          Még nincs csoport ehhez a tantárgyhoz – ha a backend úgy
          van beállítva, ilyenkor automatikusan létrehoz egyet a
          következő keresésnél.
        </Typography>
      )}

      {!loadingGroups && groups.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pb: 4,
            width: "100%",
          }}
        >
          {groups.map((group) => (
            <Card
              key={group.id}
              sx={{
                position: "relative",
                transition: "all 0.3s ease",
                background: "rgba(255, 255, 255, 1)",
                borderRadius: "20px",
                border: "1px solid rgba(102, 126, 234, 0.2)",
                boxShadow: "0 4px 20px rgba(102, 126, 234, 0.1)",
                overflow: "hidden",
                "&:hover": {
                  boxShadow:
                    "0 8px 32px rgba(102, 126, 234, 0.25)",
                  transform: "translateY(-4px)",
                  borderColor: "rgba(102, 126, 234, 0.4)",
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  display="flex"
                  flexDirection={{ xs: 'column', sm: 'row' }}  // MOBILON VÉGIGNÉZZÜK!
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                  gap={{ xs: 2, sm: 2 }}
                  flexWrap={{ xs: "wrap", sm: "nowrap" }}
                >
                  <Box flex={1} minWidth={0} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Typography
                      variant={{ xs: 'h6', sm: 'h5' }}
                      sx={{
                        fontWeight: 700,
                        color: "#2e7d32",
                        fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem' },  // Kisebb mobilon
                        lineHeight: { xs: 1.2, md: 1.3 },                     // Olvashatóbb
                        wordBreak: 'break-word',                              // Tördelés
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        WebkitLineClamp: 2,                                   // Max 2 sor
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {group.name}
                    </Typography>

                    {group.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {group.description}
                      </Typography>
                    )}

                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleViewMembers(group.id, group.name)
                        }
                        sx={{
                          color: "text.secondary",
                          "&:hover": {
                            bgcolor: "action.hover",
                          },
                        }}
                      >
                        <PeopleIcon />
                      </IconButton>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {group.member_count || 0} / 6 fő
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mt: { xs: 2, sm: 0 },  // Mobilon lent toljuk
                      ml: { xs: 0, sm: 2 },  // Desktopon jobb margó
                      width: { xs: '100%', sm: 'auto' }  // Mobilon teljes szélesség
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={
                        (group.member_count || 0) >= 6 ||
                        joiningGroupId === group.id ||
                        isUserMemberOfGroup(group)
                      }
                      startIcon={
                        joiningGroupId === group.id ? (
                          <CircularProgress
                            size={16}
                            color="inherit"
                          />
                        ) : (
                          <AddIcon />
                        )
                      }
                      sx={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        px: { xs: 3, sm: 3 },
                        py: 1.5,
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 600,
                        boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.3s ease",
                        width: { xs: '100%', sm: 'auto' },  // Mobilon teljes szélesség
                        "&:hover": {
                          background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                          boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                          transform: "translateY(-2px)",
                        },
                        "&.Mui-disabled": {
                          background: "linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)",
                          color: "#9e9e9e",
                          boxShadow: "none",
                        },
                      }}
                    >
                      {joiningGroupId === group.id
                        ? "Csatlakozás..."
                        : isUserMemberOfGroup(group)
                        ? "Már tag vagy"
                        : "Csatlakozás"}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )}
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
                Tagok - {selectedGroupName}
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
                  <Box key={member.id || index}>
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
</Box>

  );
};

export default SubjectGroupSearch;
