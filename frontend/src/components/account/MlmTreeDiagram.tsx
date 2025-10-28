import { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { UserTreeNodeResponse } from "../../services/userService";
import "./mlmTree.css";

interface NodeProps {
  node: UserTreeNodeResponse;
  onDeleteUser?: (userId: string, username: string) => void;
  isAdmin?: boolean;
}

// Function để đếm thành viên theo DEPTH LEVEL (cấp độ tương đối từ node hiện tại)
const countMembersByDepth = (node: UserTreeNodeResponse): Record<string, number> => {
  const counts: Record<string, number> = {
    F1: 0, // Con trực tiếp
    F2: 0, // Cháu (con của con)
    F3: 0, // Chắt
    F4: 0, // Chút
    F5: 0, // Cấp 5
    F6: 0, // Cấp 6
  };

  const traverse = (currentNode: UserTreeNodeResponse, depth: number) => {
    const children = currentNode.children ?? [];
    
    children.forEach((child) => {
      // Depth 1 = F1, Depth 2 = F2, etc.
      const levelKey = `F${depth}`;
      if (counts[levelKey] !== undefined) {
        counts[levelKey]++;
      }
      
      // Đệ quy để đếm các cấp con sâu hơn
      if (depth < 6) {
        traverse(child, depth + 1);
      }
    });
  };

  // Bắt đầu từ depth = 1 (con trực tiếp = F1)
  traverse(node, 1);
  return counts;
};

const TreeNode: React.FC<NodeProps> = ({ node, onDeleteUser, isAdmin = false }) => {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if this node can be deleted (no children and not admin)
  const canDelete = !hasChildren && node.user.role?.toUpperCase() !== 'ADMIN' && isAdmin;

  // Tính toán tổng thành viên theo cấp độ tương đối (depth level)
  const memberStats = useMemo(() => {
    if (!hasChildren) return null;
    
    const isAdmin = node.user.role.toUpperCase() === 'ADMIN';
    const counts = countMembersByDepth(node);
    
    // Nếu KHÔNG phải ADMIN, cần điều chỉnh label
    // Node đó = F1, con của nó = F2, cháu = F3...
    let adjustedCounts: Record<string, number>;
    
    if (isAdmin) {
      // ADMIN: Con là F1, cháu là F2...
      adjustedCounts = counts;
    } else {
      // Node khác: Node này = F1, con = F2, cháu = F3...
      adjustedCounts = {
        F1: 0, // Không đếm chính nó
        F2: counts.F1, // Con trực tiếp → F2
        F3: counts.F2, // Cháu → F3
        F4: counts.F3, // Chắt → F4
        F5: counts.F4, // → F5
        F6: counts.F5, // → F6
      };
    }
    
    const total = Object.values(adjustedCounts).reduce((sum, count) => sum + count, 0);
    
    return {
      total,
      byDepth: adjustedCounts,
    };
  }, [node, hasChildren]);

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCardClick = () => {
    // Click anywhere on card to toggle
    handleToggle();
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleToggle();
  };

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 20
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteUser) {
      onDeleteUser(node.user.id, node.user.username || 'Unknown');
    }
  };

  // Determine role badge color
  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'role-admin';
      case 'distributor':
        return 'role-distributor';
      case 'customer':
        return 'role-customer';
      default:
        return 'role-default';
    }
  };

  return (
    <li className={`tree-node ${hasChildren && !isExpanded ? 'tree-node-collapsed' : ''}`}>
      <div 
        className="node-card-wrapper"
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="node-card" onClick={handleCardClick}>
          {/* Delete Button - Only for leaf nodes */}
          {canDelete && (
            <button
              className="node-delete-btn"
              onClick={handleDeleteClick}
              title="Xóa tài khoản (không có nhánh)"
              aria-label="Xóa tài khoản"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Username */}
          <div className="node-username">{node.user.username || 'Unknown'}</div>

          {/* Role Badge */}
          <span className={`role-tag ${getRoleBadgeClass(node.user.role)}`}>
            {node.user.role}
          </span>

          {/* Children Count */}
          {hasChildren && (
            <div className="node-footer">
              <div className="children-info">
                <svg className="footer-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{children.length}</span>
              </div>
              <button 
                className="expand-btn"
                onClick={handleButtonClick}
                aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
              >
                <svg 
                  className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Tooltip rendered via Portal - Always on top */}
        {showTooltip && createPortal(
          <div 
            className="node-tooltip-portal"
            style={{
              position: 'fixed',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 999999
            }}
          >
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong>{node.user.username || 'Unknown'}</strong>
                <span className={`role-tag ${getRoleBadgeClass(node.user.role)}`}>
                  {node.user.role}
                </span>
              </div>
              <div className="tooltip-body">
                <div className="tooltip-item">
                  <span className="tooltip-label">Mã giới thiệu:</span>
                  <span className="tooltip-value">{node.user.referralCode}</span>
                </div>
                {node.user.email && (
                  <div className="tooltip-item">
                    <span className="tooltip-label">Email:</span>
                    <span className="tooltip-value">{node.user.email}</span>
                  </div>
                )}
                {node.user.phone && (
                  <div className="tooltip-item">
                    <span className="tooltip-label">Phone:</span>
                    <span className="tooltip-value">{node.user.phone}</span>
                  </div>
                )}
                <div className="tooltip-item">
                  <span className="tooltip-label">Trạng thái:</span>
                  <span className="tooltip-value">{node.user.status}</span>
                </div>
                {hasChildren && memberStats && (
                  <>
                    <div className="tooltip-divider"></div>
                    <div className="tooltip-item">
                      <span className="tooltip-label">Tổng thành viên:</span>
                      <span className="tooltip-value font-bold">{memberStats.total}</span>
                    </div>
                    {Object.entries(memberStats.byDepth).map(([level, count]) => 
                      count > 0 ? (
                        <div key={level} className="tooltip-item tooltip-sub-item">
                          <span className="tooltip-label">{level}:</span>
                          <span className="tooltip-value">{count}</span>
                        </div>
                      ) : null
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {hasChildren && (
        <ul className={`tree-children ${!isExpanded ? 'tree-children-collapsed' : ''}`}>
          {children.map((child) => (
            <TreeNode
              key={child.user.id}
              node={child}
              onDeleteUser={onDeleteUser}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface DiagramProps {
  data: UserTreeNodeResponse[];
  onDeleteUser?: (userId: string, username: string) => void;
  isAdmin?: boolean;
}

const MlmTreeDiagram: React.FC<DiagramProps> = ({ data, onDeleteUser, isAdmin = false }) => {
  if (!data.length) {
    return (
      <div className="mlm-tree-empty">
        <svg className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>Không có dữ liệu cây MLM</p>
      </div>
    );
  }

  // Root node (admin) luôn ở giữa
  return (
    <div className="tree tree-centered">
      <ul>
        {data.map((node) => (
          <TreeNode
            key={node.user.id}
            node={node}
            onDeleteUser={onDeleteUser}
            isAdmin={isAdmin}
          />
        ))}
      </ul>
    </div>
  );
};

export default MlmTreeDiagram;
