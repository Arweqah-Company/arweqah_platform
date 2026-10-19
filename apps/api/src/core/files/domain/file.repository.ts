import type { StoredFile } from '../domain/stored-file.entity';

export abstract class FileRepository {
  abstract findById(id: string): Promise<StoredFile | null>;
  abstract save(file: StoredFile): Promise<StoredFile>;
}
