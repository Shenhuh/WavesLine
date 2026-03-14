"use client";

import Avatar from "@/app/components/chat/Avatar";

type ChatCharacter = {
  name: string;
  color: string;
  avatar: string;
  title: string;
  annoyanceThreshold: number;
  annoyanceBlockMessage: string;
};

type AddContactModalProps = {
  existing: string[];
  characters: Record<string, ChatCharacter>;
  onAdd: (key: string) => void;
  onCancel: () => void;
};

export default function AddContactModal({
  existing,
  characters,
  onAdd,
  onCancel,
}: AddContactModalProps) {
  const available = Object.keys(characters).filter(
    (key) => !existing.includes(key)
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#2a2c38",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          padding: 20,
          width: 280,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p
          style={{
            color: "#e8e8ee",
            fontSize: 14,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Add Contact
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {available.length === 0 && (
            <p
              style={{
                color: "#555",
                fontSize: 12,
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              All contacts added!
            </p>
          )}

          {available.map((key) => {
            const character = characters[key];

            return (
              <button
                key={key}
                onClick={() => onAdd(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(200,168,48,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                }
              >
                <Avatar
                  src={character.avatar}
                  name={character.name}
                  size={38}
                  color={character.color}
                />
                <div>
                  <p
                    style={{
                      color: "#e8e8ee",
                      fontSize: 13,
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    {character.name}
                  </p>
                  <p
                    style={{
                      color: character.color,
                      fontSize: 11,
                      margin: 0,
                    }}
                  >
                    {character.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onCancel}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "8px 0",
            color: "#888",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}